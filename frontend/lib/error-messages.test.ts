import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { getErrorMessage } from "./error-messages";
import type { AppErrorCode } from "./types";

const ALL_CODES: AppErrorCode[] = [
  "MALFORMED_JSON",
  "UNAUTHENTICATED",
  "INVALID_CREDENTIALS",
  "DOCUMENT_NOT_FOUND",
  "LINE_NOT_FOUND",
  "ROUTE_NOT_FOUND",
  "EMAIL_ALREADY_REGISTERED",
  "FINALIZED_DOCUMENT_IMMUTABLE",
  "DOCUMENT_ALREADY_FINALIZED",
  "PAYLOAD_TOO_LARGE",
  "VALIDATION_ERROR",
  "INVALID_QUANTITY",
  "INVALID_UNIT_PRICE",
  "INVALID_PERCENT",
  "INVALID_DISCOUNT_SHAPE",
  "INVALID_DISCOUNT_VALUE",
  "DISCOUNT_EXCEEDS_SUBTOTAL",
  "TOO_MANY_LINES",
  "DOCUMENT_HAS_NO_LINES",
  "STATUS_NOT_PATCHABLE",
  "INVALID_DATE_RANGE",
  "INVALID_PAGINATION",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
];

describe("getErrorMessage", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("returns a non-empty, defined message for every known code", () => {
    for (const code of ALL_CODES) {
      const message = getErrorMessage(code);
      expect(message, `code: ${code}`).toBeTypeOf("string");
      expect(message.length, `code: ${code}`).toBeGreaterThan(0);
    }
  });

  test("never returns the raw code as the message", () => {
    for (const code of ALL_CODES) {
      const message = getErrorMessage(code);
      expect(message, `code: ${code}`).not.toBe(code);
    }
  });

  test("returns the generic fallback for an unknown code without throwing", () => {
    const result = getErrorMessage("SOMETHING_NOT_IN_THE_CATALOG");
    expect(result).toBe("Something went wrong. Please try again.");
    expect(result).not.toBeUndefined();
    expect(result).not.toBeNull();
    expect(console.error).toHaveBeenCalled();
  });

  test("every known code maps to a unique message", () => {
    const seen = new Map<string, AppErrorCode>();
    for (const code of ALL_CODES) {
      const message = getErrorMessage(code);
      if (seen.has(message)) {
        throw new Error(
          `duplicate message "${message}" for codes ${seen.get(message)} and ${code}`,
        );
      }
      seen.set(message, code);
    }
  });
});