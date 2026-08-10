import { err, type Result } from "neverthrow";
import type {
  CalculateDocumentErr,
  CalculateDocumentOk,
  DocumentTotals,
  LineInput,
  LineResult,
  PricingError,
} from "./pricing.types";

// SDD §6.0 (Stubs): domain stubs return err with any valid code from the
// domain error union (PricingErrorCode). INVALID_QUANTITY is in
// PricingErrorCode, so no cast is needed and the type system is satisfied.
const STUB_ERR = {
  code: "INVALID_QUANTITY" as const,
  message: "not implemented",
};

export function calculateLine(_input: LineInput): Result<LineResult, PricingError> {
  return err(STUB_ERR);
}

export function calculateDocumentTotals(_lines: LineResult[]): DocumentTotals {
  return {
    subtotalCents: 0,
    totalDiscountCents: 0,
    totalTaxCents: 0,
    grandTotalCents: 0,
  };
}

export function calculateDocument(
  _lines: LineInput[],
): Result<CalculateDocumentOk, CalculateDocumentErr> {
  return err({
    lineIndex: 0,
    error: STUB_ERR,
  });
}