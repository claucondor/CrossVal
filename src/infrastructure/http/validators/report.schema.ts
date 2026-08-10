import { z } from "zod";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "INVALID_DATE");

export const ReportSummaryQuerySchema = z
  .object({
    from: dateOnly,
    to: dateOnly,
  })
  .strict()
  .refine((q) => q.from <= q.to, { message: "INVALID_DATE_RANGE" });

export type ReportSummaryQueryDto = z.infer<typeof ReportSummaryQuerySchema>;