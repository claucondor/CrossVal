import type { AppErrorCode } from "./types";

const MESSAGES: Record<AppErrorCode, string> = {
  MALFORMED_JSON:
    "We couldn't read the data you sent. Please refresh the page and try again.",
  UNAUTHENTICATED:
    "Your session expired, please sign in again.",
  INVALID_CREDENTIALS:
    "Incorrect email or password.",
  DOCUMENT_NOT_FOUND:
    "This document doesn't exist or has been removed.",
  LINE_NOT_FOUND:
    "This line item no longer exists. Please refresh the page.",
  ROUTE_NOT_FOUND:
    "Page not found.",
  EMAIL_ALREADY_REGISTERED:
    "An account with this email already exists. Please sign in.",
  FINALIZED_DOCUMENT_IMMUTABLE:
    "This document is finalized and can no longer be edited.",
  DOCUMENT_ALREADY_FINALIZED:
    "This document has already been finalized.",
  PAYLOAD_TOO_LARGE:
    "The data you sent is too large. Please reduce the size and try again.",
  VALIDATION_ERROR:
    "Some fields are invalid. Please review and correct them.",
  INVALID_QUANTITY:
    "Quantity must be a whole number between 1 and 10,000.",
  INVALID_UNIT_PRICE:
    "Unit price must be a non-negative whole number.",
  INVALID_PERCENT:
    "Tax percentage must be between 0 and 100 with up to two decimals.",
  INVALID_DISCOUNT_SHAPE:
    "The discount is not in the correct format.",
  INVALID_DISCOUNT_VALUE:
    "Discount value is invalid.",
  DISCOUNT_EXCEEDS_SUBTOTAL:
    "Discount cannot be larger than the line subtotal.",
  TOO_MANY_LINES:
    "Too many line items. Please remove some before saving.",
  DOCUMENT_HAS_NO_LINES:
    "Please add at least one line item before finalizing.",
  STATUS_NOT_PATCHABLE:
    "Document status cannot be changed directly.",
  INVALID_DATE_RANGE:
    "The date range is invalid. Please check the start and end dates.",
  INVALID_PAGINATION:
    "Pagination parameters are invalid.",
  RATE_LIMITED:
    "You're doing that too fast. Please wait a moment and try again.",
  INTERNAL_ERROR:
    "Something went wrong on our end. Please try again.",
};

const FALLBACK_MESSAGE =
  "Something went wrong. Please try again.";

export function getErrorMessage(code: string): string {
  if (code in MESSAGES) {
    return MESSAGES[code as AppErrorCode];
  }
  console.error(`Unrecognized error code received from API: ${code}`);
  return FALLBACK_MESSAGE;
}