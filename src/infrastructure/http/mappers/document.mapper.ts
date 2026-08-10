import type {
  LineDiscount,
  LineDiscountDto,
} from "../../../application/documents/document.service.types";

// Domain input shape (matches Mongoose document / internal service result).
export interface MockDocumentLike {
  id: string;
  title: string;
  customer: string;
  issueDate: Date | string;
  status: "draft" | "finalized";
  lines: MockLineLike[];
  subtotalCents: number;
  totalDiscountCents: number;
  totalTaxCents: number;
  grandTotalCents: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface MockLineLike {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  discount: LineDiscount;
  taxBp: number;
  lineSubtotalCents: number;
  discountAmountCents: number;
  taxAmountCents: number;
  lineTotalCents: number;
}

// HTTP DTO shapes — exactly as §5.3. The mapper converts domain (bp) → DTO
// (human percent) here, and nowhere else.
export interface LineItemResponse {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  discount: LineDiscountDto;
  taxPercent: number;
  lineSubtotalCents: number;
  discountAmountCents: number;
  taxAmountCents: number;
  lineTotalCents: number;
}

export interface DocumentResponse {
  id: string;
  title: string;
  customer: string;
  issueDate: string;
  status: "draft" | "finalized";
  lines: LineItemResponse[];
  subtotalCents: number;
  totalDiscountCents: number;
  totalTaxCents: number;
  grandTotalCents: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentSummaryResponse {
  id: string;
  title: string;
  customer: string;
  issueDate: string;
  status: "draft" | "finalized";
  lineCount: number;
  grandTotalCents: number;
  createdAt: string;
  updatedAt: string;
}

function toDateOnly(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

function toIso(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString();
}

function discountToDto(d: LineDiscount): LineDiscountDto {
  if (d === null) return null;
  if (d.type === "fixed") return { type: "fixed", amountCents: d.amountCents };
  return { type: "percent", percent: d.percentBp / 100 };
}

export function toDocumentResponse(doc: MockDocumentLike): DocumentResponse {
  return {
    id: doc.id,
    title: doc.title,
    customer: doc.customer,
    issueDate: toDateOnly(doc.issueDate),
    status: doc.status,
    lines: doc.lines.map((l) => ({
      id: l.id,
      description: l.description,
      quantity: l.quantity,
      unitPriceCents: l.unitPriceCents,
      discount: discountToDto(l.discount),
      taxPercent: l.taxBp / 100,
      lineSubtotalCents: l.lineSubtotalCents,
      discountAmountCents: l.discountAmountCents,
      taxAmountCents: l.taxAmountCents,
      lineTotalCents: l.lineTotalCents,
    })),
    subtotalCents: doc.subtotalCents,
    totalDiscountCents: doc.totalDiscountCents,
    totalTaxCents: doc.totalTaxCents,
    grandTotalCents: doc.grandTotalCents,
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
  };
}

export function toDocumentSummaryResponse(doc: MockDocumentLike): DocumentSummaryResponse {
  return {
    id: doc.id,
    title: doc.title,
    customer: doc.customer,
    issueDate: toDateOnly(doc.issueDate),
    status: doc.status,
    lineCount: doc.lines.length,
    grandTotalCents: doc.grandTotalCents,
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
  };
}