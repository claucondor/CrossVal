import { calculateDocument, calculateDocumentTotals, calculateLine } from "./pricing";
import type { LineInput, LineResult } from "./pricing.types";

const D = (d: LineInput["discount"]): LineInput => ({
  quantity: 1,
  unitPriceCents: 10000,
  discount: d,
  taxBp: 0,
});

describe("PricingEngine — T1..T15 (SDD §6.3)", () => {
  test("T1 — brief example (3 lines) → grandTotalCents === 42150", () => {
    const lines: LineInput[] = [
      { quantity: 2, unitPriceCents: 10000, discount: { type: "percent", percentBp: 1000 }, taxBp: 500 },
      { quantity: 1, unitPriceCents: 5000, discount: null, taxBp: 500 },
      { quantity: 1, unitPriceCents: 20000, discount: { type: "fixed", amountCents: 2000 }, taxBp: 0 },
    ];
    const result = calculateDocument(lines);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    const { totals } = result.value;
    expect(totals.subtotalCents).toBe(45000);
    expect(totals.totalDiscountCents).toBe(4000);
    expect(totals.totalTaxCents).toBe(1150);
    expect(totals.grandTotalCents).toBe(42150);
  });

  test("T2 — fixed discount > subtotal → DISCOUNT_EXCEEDS_SUBTOTAL", () => {
    const result = calculateLine({
      quantity: 1,
      unitPriceCents: 5000,
      discount: { type: "fixed", amountCents: 5001 },
      taxBp: 0,
    });
    expect(result.isErr()).toBe(true);
    if (!result.isErr()) return;
    expect(result.error.code).toBe("DISCOUNT_EXCEEDS_SUBTOTAL");
    expect(result.error.field).toBe("discount.amountCents");
  });

  test("T3 — fixed discount == subtotal (border) → ok, lineTotal === 0", () => {
    const result = calculateLine({
      quantity: 1,
      unitPriceCents: 5000,
      discount: { type: "fixed", amountCents: 5000 },
      taxBp: 0,
    });
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.lineTotalCents).toBe(0);
    expect(result.value.discountAmountCents).toBe(5000);
    expect(result.value.taxAmountCents).toBe(0);
    expect(result.value.lineSubtotalCents).toBe(5000);
  });

  test("T4 — taxBp === 0 → taxAmountCents === 0, lineTotal === subtotal", () => {
    const result = calculateLine({
      quantity: 1,
      unitPriceCents: 10000,
      discount: null,
      taxBp: 0,
    });
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.taxAmountCents).toBe(0);
    expect(result.value.lineTotalCents).toBe(10000);
  });

  test("T5 — null discount, qty 3 / unit 1000 / taxBp 500 → discount === 0, lineTotal === 3150", () => {
    const result = calculateLine({
      quantity: 3,
      unitPriceCents: 1000,
      discount: null,
      taxBp: 500,
    });
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.discountAmountCents).toBe(0);
    expect(result.value.lineTotalCents).toBe(3150);
  });

  test("T6 — quantity === 1 (min valid), unit 1c, null, taxBp 0 → lineTotal === 1", () => {
    const result = calculateLine({
      quantity: 1,
      unitPriceCents: 1,
      discount: null,
      taxBp: 0,
    });
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.lineTotalCents).toBe(1);
  });

  test("T7 — non-trivial rounding: qty 3 / 333c / percent 1000bp / tax 750bp → 999/100/899/67/966", () => {
    const result = calculateLine({
      quantity: 3,
      unitPriceCents: 333,
      discount: { type: "percent", percentBp: 1000 },
      taxBp: 750,
    });
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.lineSubtotalCents).toBe(999);
    expect(result.value.discountAmountCents).toBe(100);
    expect(result.value.taxAmountCents).toBe(67);
    expect(result.value.lineTotalCents).toBe(966);
  });

  test("T8 — exact .5 tie → half-up: qty 1 / 15c / null / taxBp 1000 → taxAmountCents === 2", () => {
    const result = calculateLine({
      quantity: 1,
      unitPriceCents: 15,
      discount: null,
      taxBp: 1000,
    });
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.taxAmountCents).toBe(2);
  });

  test("T9 — document with 0 lines → all totals === 0, no NaN/undefined", () => {
    const totals = calculateDocumentTotals([]);
    expect(totals.subtotalCents).toBe(0);
    expect(totals.totalDiscountCents).toBe(0);
    expect(totals.totalTaxCents).toBe(0);
    expect(totals.grandTotalCents).toBe(0);
    for (const v of Object.values(totals)) {
      expect(Number.isFinite(v)).toBe(true);
      expect(Number.isNaN(v)).toBe(false);
    }
  });

  test("T10 — sums from already-rounded line values (BR-8)", () => {
    const single: LineInput = {
      quantity: 3,
      unitPriceCents: 333,
      discount: { type: "percent", percentBp: 1000 },
      taxBp: 750,
    };
    const oneLine = calculateLine(single);
    expect(oneLine.isOk()).toBe(true);
    if (!oneLine.isOk()) return;
    const repeated: LineResult[] = [oneLine.value, oneLine.value, oneLine.value];
    const totals = calculateDocumentTotals(repeated);
    expect(totals.subtotalCents).toBe(oneLine.value.lineSubtotalCents * 3);
    expect(totals.totalDiscountCents).toBe(oneLine.value.discountAmountCents * 3);
    expect(totals.totalTaxCents).toBe(oneLine.value.taxAmountCents * 3);
    expect(totals.grandTotalCents).toBe(oneLine.value.lineTotalCents * 3);
  });

  test("T11 — coherence invariant: grandTotal === subtotal − discount + tax", () => {
    const lines: LineInput[] = [
      D({ type: "percent", percentBp: 750 }),
      D({ type: "fixed", amountCents: 1234 }),
      D(null),
      { quantity: 5, unitPriceCents: 7777, discount: { type: "percent", percentBp: 1234 }, taxBp: 2100 },
    ];
    const result = calculateDocument(lines);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    const { totals } = result.value;
    expect(totals.grandTotalCents).toBe(
      totals.subtotalCents - totals.totalDiscountCents + totals.totalTaxCents,
    );
  });

  test("T12 — calculateDocument aborts on the invalid line, lineIndex === 1", () => {
    const lines: LineInput[] = [
      { quantity: 1, unitPriceCents: 1000, discount: null, taxBp: 0 },
      { quantity: 1, unitPriceCents: 5000, discount: { type: "fixed", amountCents: 99999 }, taxBp: 0 },
      { quantity: 1, unitPriceCents: 2000, discount: null, taxBp: 0 },
    ];
    const result = calculateDocument(lines);
    expect(result.isErr()).toBe(true);
    if (!result.isErr()) return;
    expect(result.error.lineIndex).toBe(1);
    expect(result.error.error.code).toBe("DISCOUNT_EXCEEDS_SUBTOTAL");
  });

  test("T13 — 2-decimal percent: qty 1 / 10000c / null / taxBp 725 → taxAmountCents === 725", () => {
    const result = calculateLine({
      quantity: 1,
      unitPriceCents: 10000,
      discount: null,
      taxBp: 725,
    });
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.taxAmountCents).toBe(725);
  });

  test("T14 — upper magnitude bound: qty 10_000 / unitPrice 10_000_000 ok; over limits → errors", () => {
    const okResult = calculateLine({
      quantity: 10_000,
      unitPriceCents: 10_000_000,
      discount: null,
      taxBp: 0,
    });
    expect(okResult.isOk()).toBe(true);

    const qtyOver = calculateLine({
      quantity: 10_001,
      unitPriceCents: 1,
      discount: null,
      taxBp: 0,
    });
    expect(qtyOver.isErr()).toBe(true);
    if (qtyOver.isErr()) expect(qtyOver.error.code).toBe("INVALID_QUANTITY");

    const unitOver = calculateLine({
      quantity: 1,
      unitPriceCents: 10_000_001,
      discount: null,
      taxBp: 0,
    });
    expect(unitOver.isErr()).toBe(true);
    if (unitOver.isErr()) expect(unitOver.error.code).toBe("INVALID_UNIT_PRICE");
  });

  test("T15 — non-integer inputs → INVALID_QUANTITY / INVALID_UNIT_PRICE", () => {
    const qty = calculateLine({
      quantity: 1.5,
      unitPriceCents: 100,
      discount: null,
      taxBp: 0,
    });
    expect(qty.isErr()).toBe(true);
    if (qty.isErr()) expect(qty.error.code).toBe("INVALID_QUANTITY");

    const unit = calculateLine({
      quantity: 1,
      unitPriceCents: 10.5,
      discount: null,
      taxBp: 0,
    });
    expect(unit.isErr()).toBe(true);
    if (unit.isErr()) expect(unit.error.code).toBe("INVALID_UNIT_PRICE");
  });
});
