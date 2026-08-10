import { bpToPercent } from "../../../domain/pricing/money";
import type {
  DocumentResult,
  DocumentSummaryResult,
  LineDiscount,
  LineDiscountDto,
  LineItemResult,
} from "../../../application/documents/document.service.types";

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

function discountToDto(d: LineDiscount): LineDiscountDto {
  if (d === null) return null;
  if (d.type === "fixed") return { type: "fixed", amountCents: d.amountCents };
  return { type: "percent", percent: bpToPercent(d.percentBp) };
}

function toLineItemResponse(line: LineItemResult): LineItemResponse {
  return {
    id: line.id,
    description: line.description,
    quantity: line.quantity,
    unitPriceCents: line.unitPriceCents,
    discount: discountToDto(line.discount),
    taxPercent: bpToPercent(line.taxBp),
    lineSubtotalCents: line.lineSubtotalCents,
    discountAmountCents: line.discountAmountCents,
    taxAmountCents: line.taxAmountCents,
    lineTotalCents: line.lineTotalCents,
  };
}

export function toDocumentResponse(doc: DocumentResult): DocumentResponse {
  return {
    id: doc.id,
    title: doc.title,
    customer: doc.customer,
    issueDate: doc.issueDate,
    status: doc.status,
    lines: doc.lines.map(toLineItemResponse),
    subtotalCents: doc.subtotalCents,
    totalDiscountCents: doc.totalDiscountCents,
    totalTaxCents: doc.totalTaxCents,
    grandTotalCents: doc.grandTotalCents,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function toDocumentSummaryResponse(doc: DocumentSummaryResult): DocumentSummaryResponse {
  return {
    id: doc.id,
    title: doc.title,
    customer: doc.customer,
    issueDate: doc.issueDate,
    status: doc.status,
    lineCount: doc.lineCount,
    grandTotalCents: doc.grandTotalCents,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
