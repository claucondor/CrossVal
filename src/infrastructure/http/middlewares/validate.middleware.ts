import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import type { ZodTypeAny } from "zod";
import { ERROR_STATUS, ERROR_MESSAGES, type AppErrorCode } from "../../../application/errors";

type Source = "body" | "params" | "query";

function fieldFromPath(path: (string | number)[]): string {
  if (path.length === 0) return "(root)";
  return path
    .map((seg, i) => (typeof seg === "number" ? `[${seg}]` : i === 0 ? seg : `.${seg}`))
    .join("");
}

function codeForZodMessage(message: string): string {
  switch (message) {
    case "INVALID_DATE_RANGE":
      return "INVALID_DATE_RANGE";
    case "INVALID_DATE":
      return "VALIDATION_ERROR";
    case "INVALID_PERCENT":
      return "INVALID_PERCENT";
    case "INVALID_DISCOUNT_SHAPE":
      return "INVALID_DISCOUNT_SHAPE";
    case "INVALID_DISCOUNT_VALUE":
      return "INVALID_DISCOUNT_VALUE";
    case "TOO_MANY_LINES":
      return "TOO_MANY_LINES";
    case "STATUS_NOT_PATCHABLE":
      return "STATUS_NOT_PATCHABLE";
    case "EMPTY_PATCH":
      return "VALIDATION_ERROR";
    case "INVALID_OBJECT_ID":
      // Internal signal from the ObjectId refine; the middleware rewrites it
      // into a real AppErrorCode (DOCUMENT_NOT_FOUND / LINE_NOT_FOUND) below.
      return "INVALID_OBJECT_ID";
    default:
      return "VALIDATION_ERROR";
  }
}

export function validate(source: Source, schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const data = req[source];
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      const zErr = parsed.error as ZodError;
      const issue = zErr.issues[0];
      const field = issue ? fieldFromPath(issue.path) : "(root)";
      const rawCode = codeForZodMessage(issue?.message ?? "");
      // Per §4.1.6: an invalid `:id` / `:lineId` is treated as "not found",
      // never as 422 — so the request shape itself never leaks the difference.
      // The response must be byte-identical to a genuinely nonexistent
      // resource: same code, same message, and no `field` either.
      const isObjectIdRewrite = rawCode === "INVALID_OBJECT_ID";
      const code: AppErrorCode = isObjectIdRewrite
        ? field === "lineId"
          ? "LINE_NOT_FOUND"
          : "DOCUMENT_NOT_FOUND"
        : (rawCode as AppErrorCode);
      res.status(ERROR_STATUS[code]).json({
        error: isObjectIdRewrite
          ? { code, message: ERROR_MESSAGES[code] }
          : { code, message: ERROR_MESSAGES[code], field },
      });
      return;
    }
    // Re-assign the parsed value (coerced/defaulted) onto the request.
    (req as unknown as Record<Source, unknown>)[source] = parsed.data;
    next();
  };
}
