import type { Result } from "neverthrow";
import type { AppError } from "../errors";

export type DocumentStatus = "draft" | "finalized";

// Domain shape — used by the service for output LineItemResult.
// percentBp = integer basis points (0..10000), see §2.3.
export type LineDiscount =
  | null
  | { type: "fixed"; amountCents: number }
  | { type: "percent"; percentBp: number };

// HTTP DTO shape — used by the service for inputs coming from the HTTP layer.
// percent = human percentage 0..100 with max 2 decimals, see §5.2 / §5.3.
export type LineDiscountDto =
  | null
  | { type: "fixed"; amountCents: number }
  | { type: "percent"; percent: number };

export interface LineItemResult {
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

export interface DocumentResult {
  id: string;
  title: string;
  customer: string;
  issueDate: string;
  status: DocumentStatus;
  lines: LineItemResult[];
  subtotalCents: number;
  totalDiscountCents: number;
  totalTaxCents: number;
  grandTotalCents: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentSummaryResult {
  id: string;
  title: string;
  customer: string;
  issueDate: string;
  status: DocumentStatus;
  lineCount: number;
  grandTotalCents: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentSummaryPage {
  items: DocumentSummaryResult[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CreateDocumentInput {
  title: string;
  customer: string;
  issueDate: string;
  lines: Array<{
    description: string;
    quantity: number;
    unitPriceCents: number;
    discount: LineDiscountDto;
    taxPercent: number;
  }>;
}

export interface PatchDocumentInput {
  title?: string;
  customer?: string;
  issueDate?: string;
}

export interface PatchLineInput {
  description?: string;
  quantity?: number;
  unitPriceCents?: number;
  discount?: LineDiscountDto | null;
  taxPercent?: number;
}

export interface DocumentService {
  create(
    userId: string,
    input: CreateDocumentInput,
  ): Promise<Result<DocumentResult, AppError>>;
  findOne(userId: string, id: string): Promise<Result<DocumentResult, AppError>>;
  list(
    userId: string,
    page: number,
    limit: number,
  ): Promise<Result<DocumentSummaryPage, AppError>>;
  patch(
    userId: string,
    id: string,
    patch: PatchDocumentInput,
  ): Promise<Result<DocumentResult, AppError>>;
  delete(userId: string, id: string): Promise<Result<null, AppError>>;
  addLine(
    userId: string,
    id: string,
    input: CreateDocumentInput["lines"][number],
  ): Promise<Result<DocumentResult, AppError>>;
  patchLine(
    userId: string,
    id: string,
    lineId: string,
    patch: PatchLineInput,
  ): Promise<Result<DocumentResult, AppError>>;
  deleteLine(
    userId: string,
    id: string,
    lineId: string,
  ): Promise<Result<DocumentResult, AppError>>;
  finalize(userId: string, id: string): Promise<Result<DocumentResult, AppError>>;
  duplicate(userId: string, id: string): Promise<Result<DocumentResult, AppError>>;
}