import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import type { ZodTypeAny } from "zod";

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
      return "INVALID_DATE";
    case "EMPTY_PATCH":
      return "VALIDATION_ERROR";
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
      const code = codeForZodMessage(issue?.message ?? "");
      res.status(422).json({
        error: {
          code,
          message: issue?.message ?? "Validation failed",
          field,
        },
      });
      return;
    }
    // Re-assign the parsed value (coerced/defaulted) onto the request.
    (req as unknown as Record<Source, unknown>)[source] = parsed.data;
    next();
  };
}