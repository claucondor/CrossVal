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

export interface AppError {
  code: AppErrorCode;
  message: string;
  field?: string;
}

export const ERROR_STATUS: Record<AppErrorCode, number> = {
  MALFORMED_JSON: 400,
  UNAUTHENTICATED: 401,
  INVALID_CREDENTIALS: 401,
  DOCUMENT_NOT_FOUND: 404,
  LINE_NOT_FOUND: 404,
  ROUTE_NOT_FOUND: 404,
  EMAIL_ALREADY_REGISTERED: 409,
  FINALIZED_DOCUMENT_IMMUTABLE: 409,
  DOCUMENT_ALREADY_FINALIZED: 409,
  PAYLOAD_TOO_LARGE: 413,
  VALIDATION_ERROR: 422,
  INVALID_QUANTITY: 422,
  INVALID_UNIT_PRICE: 422,
  INVALID_PERCENT: 422,
  INVALID_DISCOUNT_SHAPE: 422,
  INVALID_DISCOUNT_VALUE: 422,
  DISCOUNT_EXCEEDS_SUBTOTAL: 422,
  TOO_MANY_LINES: 422,
  DOCUMENT_HAS_NO_LINES: 422,
  STATUS_NOT_PATCHABLE: 422,
  INVALID_DATE_RANGE: 422,
  INVALID_PAGINATION: 422,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

export const ERROR_MESSAGES: Record<AppErrorCode, string> = {
  MALFORMED_JSON: "Request body is not valid JSON",
  UNAUTHENTICATED: "Missing or invalid Authorization header",
  INVALID_CREDENTIALS: "Invalid email or password",
  DOCUMENT_NOT_FOUND: "Document not found",
  LINE_NOT_FOUND: "Line not found",
  ROUTE_NOT_FOUND: "Route not found",
  EMAIL_ALREADY_REGISTERED: "Email is already registered",
  FINALIZED_DOCUMENT_IMMUTABLE: "Document is finalized and cannot be modified",
  DOCUMENT_ALREADY_FINALIZED: "Document is already finalized",
  PAYLOAD_TOO_LARGE: "Request body exceeds 100kb",
  VALIDATION_ERROR: "Validation failed",
  INVALID_QUANTITY: "quantity must be an integer in [1, 10000]",
  INVALID_UNIT_PRICE: "unitPriceCents must be an integer in [0, 10000000]",
  INVALID_PERCENT: "Percent must be between 0 and 100 with at most 2 decimal places",
  INVALID_DISCOUNT_SHAPE: "A line may have either a percent or a fixed discount, not both",
  INVALID_DISCOUNT_VALUE: "Discount amountCents must be a non-negative integer",
  DISCOUNT_EXCEEDS_SUBTOTAL: "Discount amountCents cannot exceed lineSubtotalCents",
  TOO_MANY_LINES: "A document cannot have more than 200 lines",
  DOCUMENT_HAS_NO_LINES: "Document has no lines and cannot be finalized",
  STATUS_NOT_PATCHABLE: "Status cannot be changed via PATCH; use the finalize endpoint",
  INVALID_DATE_RANGE: "from and to must be valid YYYY-MM-DD dates with from <= to",
  INVALID_PAGINATION: "page must be an integer >= 1 and limit an integer in [1, 100]",
  RATE_LIMITED: "Too many auth requests; try again later",
  INTERNAL_ERROR: "Internal server error",
};
