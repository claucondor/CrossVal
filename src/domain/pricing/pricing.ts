import { ok, err } from "neverthrow";
import { roundHalfUp } from "./money";
import type {
  CalculateDocumentErr,
  CalculateDocumentOk,
  DocumentTotals,
  LineInput,
  LineResult,
  PricingError,
} from "./pricing.types";

export function calculateLine(input: LineInput) {
  const { quantity, unitPriceCents, discount, taxBp } = input;

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10_000) {
    return err({
      code: "INVALID_QUANTITY",
      message: "quantity must be an integer in [1, 10000]",
      field: "quantity",
    });
  }

  if (
    !Number.isInteger(unitPriceCents) ||
    unitPriceCents < 0 ||
    unitPriceCents > 10_000_000
  ) {
    return err({
      code: "INVALID_UNIT_PRICE",
      message: "unitPriceCents must be an integer in [0, 10000000]",
      field: "unitPriceCents",
    });
  }

  if (!Number.isInteger(taxBp) || taxBp < 0 || taxBp > 10_000) {
    return err({
      code: "INVALID_PERCENT",
      message: "taxBp must be an integer in [0, 10000]",
      field: "taxBp",
    });
  }

  const lineSubtotalCents = quantity * unitPriceCents;

  let discountAmountCents = 0;
  if (discount !== null) {
    if (discount.type === "fixed") {
      if (!Number.isInteger(discount.amountCents) || discount.amountCents < 0) {
        return err({
          code: "INVALID_DISCOUNT_VALUE",
          message: "discount.amountCents must be a non-negative integer",
          field: "discount.amountCents",
        });
      }
      if (discount.amountCents > lineSubtotalCents) {
        return err({
          code: "DISCOUNT_EXCEEDS_SUBTOTAL",
          message: "discount.amountCents cannot exceed lineSubtotalCents",
          field: "discount.amountCents",
        });
      }
      discountAmountCents = discount.amountCents;
    } else {
      if (
        !Number.isInteger(discount.percentBp) ||
        discount.percentBp < 0 ||
        discount.percentBp > 10_000
      ) {
        return err({
          code: "INVALID_PERCENT",
          message: "discount.percentBp must be an integer in [0, 10000]",
          field: "discount.percentBp",
        });
      }
      discountAmountCents = roundHalfUp(lineSubtotalCents * discount.percentBp, 10_000);
    }
  }

  const afterDiscountCents = lineSubtotalCents - discountAmountCents;
  const taxAmountCents = roundHalfUp(afterDiscountCents * taxBp, 10_000);
  const lineTotalCents = afterDiscountCents + taxAmountCents;

  return ok({
    lineSubtotalCents,
    discountAmountCents,
    taxAmountCents,
    lineTotalCents,
  });
}

export function calculateDocumentTotals(lines: LineResult[]): DocumentTotals {
  const subtotalCents = lines.reduce((acc, l) => acc + l.lineSubtotalCents, 0);
  const totalDiscountCents = lines.reduce((acc, l) => acc + l.discountAmountCents, 0);
  const totalTaxCents = lines.reduce((acc, l) => acc + l.taxAmountCents, 0);
  const grandTotalCents = lines.reduce((acc, l) => acc + l.lineTotalCents, 0);
  return {
    subtotalCents,
    totalDiscountCents,
    totalTaxCents,
    grandTotalCents,
  };
}

export function calculateDocument(lines: LineInput[]) {
  const results: LineResult[] = [];
  for (let i = 0; i < lines.length; i++) {
    const result = calculateLine(lines[i]);
    if (result.isErr()) {
      return err({
        lineIndex: i,
        error: result.error,
      });
    }
    results.push(result.value);
  }
  return ok({
    lines: results,
    totals: calculateDocumentTotals(results),
  });
}