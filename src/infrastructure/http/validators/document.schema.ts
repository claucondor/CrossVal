import { Types } from "mongoose";
import { z } from "zod";

const objectId = z
  .string()
  .refine((v) => Types.ObjectId.isValid(v), { message: "invalid ObjectId" });

// Per SDD §2.3: a human percent whose `percent * 100` is not within 1e-9 of
// an integer (e.g. 7.333) must be rejected with INVALID_PERCENT. Validation
// lives ONLY at the HTTP frontier; `percentToBp` keeps its current contract.
const percentValue = z
  .number()
  .min(0)
  .max(100)
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-9, {
    message: "INVALID_PERCENT",
  });

const fixedDiscount = z
  .object({
    type: z.literal("fixed"),
    amountCents: z.number().int().min(0).max(10_000_000),
  })
  .strict();

const percentDiscount = z
  .object({
    type: z.literal("percent"),
    percent: percentValue,
  })
  .strict();

const DiscountSchema = z
  .union([z.null(), fixedDiscount, percentDiscount])
  .refine(
    (d) => {
      if (d === null) return true;
      if (d.type === "fixed") return d.amountCents >= 0;
      return true;
    },
    { message: "INVALID_DISCOUNT_VALUE" },
  );

const LineItemInputSchema = z
  .object({
    description: z.string().trim().min(1).max(200),
    quantity: z.number().int().min(1).max(10_000),
    unitPriceCents: z.number().int().min(0).max(10_000_000),
    discount: DiscountSchema.optional(),
    taxPercent: percentValue.optional(),
  })
  .strict();

export const CreateDocumentSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    customer: z.string().trim().min(1).max(200),
    issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    lines: z.array(LineItemInputSchema).max(200).optional(),
  })
  .strict();

export const PatchDocumentSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    customer: z.string().trim().min(1).max(200).optional(),
    issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .strict()
  .refine(
    (p) => p.title !== undefined || p.customer !== undefined || p.issueDate !== undefined,
    { message: "EMPTY_PATCH" },
  );

export const CreateLineSchema = LineItemInputSchema;

export const PatchLineSchema = z
  .object({
    description: z.string().trim().min(1).max(200).optional(),
    quantity: z.number().int().min(1).max(10_000).optional(),
    unitPriceCents: z.number().int().min(0).max(10_000_000).optional(),
    discount: z.union([DiscountSchema, z.null()]).optional(),
    taxPercent: percentValue.optional(),
  })
  .strict()
  .refine(
    (p) =>
      p.description !== undefined ||
      p.quantity !== undefined ||
      p.unitPriceCents !== undefined ||
      p.discount !== undefined ||
      p.taxPercent !== undefined,
    { message: "EMPTY_PATCH" },
  );

export const DocumentIdParamSchema = z.object({ id: objectId }).strict();
export const DocumentLineParamsSchema = z
  .object({ id: objectId, lineId: objectId })
  .strict();

export type CreateDocumentDto = z.infer<typeof CreateDocumentSchema>;
export type PatchDocumentDto = z.infer<typeof PatchDocumentSchema>;
export type CreateLineDto = z.infer<typeof CreateLineSchema>;
export type PatchLineDto = z.infer<typeof PatchLineSchema>;