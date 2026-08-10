import { z } from "zod";

function isValidDateString(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00.000Z`);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export const ReportSummaryQuerySchema = z
  .object({
    from: z.string({ required_error: "INVALID_DATE_RANGE" }),
    to: z.string({ required_error: "INVALID_DATE_RANGE" }),
  })
  .strict()
  .superRefine((q, ctx) => {
    const fromValid = isValidDateString(q.from);
    const toValid = isValidDateString(q.to);
    if (!fromValid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "INVALID_DATE_RANGE", path: ["from"] });
    }
    if (!toValid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "INVALID_DATE_RANGE", path: ["to"] });
    }
    if (fromValid && toValid && q.from > q.to) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "INVALID_DATE_RANGE", path: ["from"] });
    }
  });

export type ReportSummaryQueryDto = z.infer<typeof ReportSummaryQuerySchema>;
