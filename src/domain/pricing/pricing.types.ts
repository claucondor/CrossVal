import type { AppErrorCode } from "../../application/errors";

export type Discount =
  | null
  | { type: "fixed"; amountCents: number }
  | { type: "percent"; percentBp: number };

export interface LineInput {
  quantity: number;
  unitPriceCents: number;
  discount: Discount;
  taxBp: number;
}

export interface LineResult {
  lineSubtotalCents: number;
  discountAmountCents: number;
  taxAmountCents: number;
  lineTotalCents: number;
}

export type PricingErrorCode = Extract<
  AppErrorCode,
  | "INVALID_QUANTITY"
  | "INVALID_UNIT_PRICE"
  | "INVALID_PERCENT"
  | "INVALID_DISCOUNT_VALUE"
  | "DISCOUNT_EXCEEDS_SUBTOTAL"
  | "AMOUNT_LIMIT_EXCEEDED"
>;

export interface PricingError {
  code: PricingErrorCode;
  message: string;
  field?: string;
}

export interface DocumentTotals {
  subtotalCents: number;
  totalDiscountCents: number;
  totalTaxCents: number;
  grandTotalCents: number;
}

export interface CalculateDocumentOk {
  lines: LineResult[];
  totals: DocumentTotals;
}

export type CalculateDocumentErr = {
  lineIndex: number;
  error: PricingError;
};
