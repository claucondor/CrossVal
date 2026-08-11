// ---------- Auth (§5.2 Request DTOs) ----------
export interface SignupRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  userId: string;
  email: string;
  token: string;
}

// ---------- Discount (§5.2) ----------
export type DiscountDto =
  | null
  | { type: "fixed"; amountCents: number }
  | { type: "percent"; percent: number };

// ---------- Líneas (§5.2) ----------
export interface LineItemInput {
  description: string;
  quantity: number;
  unitPriceCents: number;
  discount?: DiscountDto;
  taxPercent?: number;
}

export type CreateLineRequest = LineItemInput;

export interface PatchLineRequest {
  description?: string;
  quantity?: number;
  unitPriceCents?: number;
  discount?: DiscountDto;
  taxPercent?: number;
}

// ---------- Documentos — requests (§5.2) ----------
export interface CreateDocumentRequest {
  title: string;
  customer: string;
  issueDate: string;
  lines?: LineItemInput[];
}

export interface PatchDocumentRequest {
  title?: string;
  customer?: string;
  issueDate?: string;
}

// ---------- Documentos — responses (§5.3) ----------
export interface LineItemResponse {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  discount: DiscountDto;
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

// Respuesta paginada de GET /documents (backend-sdd.md §5.1/§5.3 — la
// implementación del backend está pendiente en dev-plan Fase 6, pero el tipo
// del frontend ya refleja el contrato final, per frontend-sdd.md §5.2).
export interface DocumentListResponse {
  items: DocumentSummaryResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SummaryReportResponse {
  from: string;
  to: string;
  documentCount: number;
  grandTotalCents: number;
  totalTaxCents: number;
  totalDiscountCents: number;
}

// ---------- Error shape (§5.4/§5.5) ----------
export type AppErrorCode =
  | "MALFORMED_JSON"
  | "UNAUTHENTICATED"
  | "INVALID_CREDENTIALS"
  | "DOCUMENT_NOT_FOUND"
  | "LINE_NOT_FOUND"
  | "ROUTE_NOT_FOUND"
  | "EMAIL_ALREADY_REGISTERED"
  | "FINALIZED_DOCUMENT_IMMUTABLE"
  | "DOCUMENT_ALREADY_FINALIZED"
  | "PAYLOAD_TOO_LARGE"
  | "VALIDATION_ERROR"
  | "INVALID_QUANTITY"
  | "INVALID_UNIT_PRICE"
  | "INVALID_PERCENT"
  | "INVALID_DISCOUNT_SHAPE"
  | "INVALID_DISCOUNT_VALUE"
  | "DISCOUNT_EXCEEDS_SUBTOTAL"
  | "TOO_MANY_LINES"
  | "DOCUMENT_HAS_NO_LINES"
  | "STATUS_NOT_PATCHABLE"
  | "INVALID_DATE_RANGE"
  | "INVALID_PAGINATION"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export interface ApiErrorBody {
  code: AppErrorCode;
  message: string;
  field?: string;
}

export interface ApiError {
  error: ApiErrorBody;
}