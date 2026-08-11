import type { NextFunction, Request, Response } from "express";
import { ERROR_STATUS, type AppError } from "../../../application/errors";

interface HttpErrorLike extends Error {
  status?: number;
  code?: string;
  type?: string;
}

const KNOWN_ERROR_CODES = new Set(Object.keys(ERROR_STATUS));

function isAppError(value: unknown): value is AppError {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.code === "string" &&
    KNOWN_ERROR_CODES.has(v.code) &&
    typeof v.message === "string"
  );
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (isAppError(err)) {
    const status = ERROR_STATUS[err.code];
    res.status(status).json({ error: err });
    return;
  }

  const httpErr = err as HttpErrorLike;
  if (httpErr && httpErr.type === "entity.too.large") {
    res.status(ERROR_STATUS.PAYLOAD_TOO_LARGE).json({
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "Request body exceeds 100kb",
      },
    });
    return;
  }
  if (
    httpErr &&
    (httpErr.type === "entity.parse.failed" || httpErr instanceof SyntaxError)
  ) {
    res.status(ERROR_STATUS.MALFORMED_JSON).json({
      error: {
        code: "MALFORMED_JSON",
        message: "Request body is not valid JSON",
      },
    });
    return;
  }

  // Fallback: never expose stack or internal messages (SDD §5.5 INTERNAL_ERROR).
  // eslint-disable-next-line no-console
  console.error(
    "[error-handler] unhandled error:",
    err instanceof Error ? err.message : String(err),
  );
  res.status(ERROR_STATUS.INTERNAL_ERROR).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Internal server error",
    },
  });
}