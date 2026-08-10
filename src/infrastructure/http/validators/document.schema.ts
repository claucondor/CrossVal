import { Types } from "mongoose";
import { z } from "zod";

const objectId = z
  .string()
  .refine((v) => Types.ObjectId.isValid(v), { message: "INVALID_OBJECT_ID" });

// Per SDD §2.3: a human percent whose `percent * 100` is not within 1e-9 of
// an integer (e.g. 7.333) must be rejected with INVALID_PERCENT. A percent
// outside 0..100 must also surface as INVALID_PERCENT, not VALIDATION_ERROR.
const percentValue = z
  .number()
  .min(0, { message: "INVALID_PERCENT" })
  .max(100, { message: "INVALID_PERCENT" })
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-9, {
    message: "INVALID_PERCENT",
  });

const fixedDiscount = z
  .object({
    type: z.literal("fixed"),
    amountCents: z
      .number({ invalid_type_error: "INVALID_DISCOUNT_VALUE" })
      .int({ message: "INVALID_DISCOUNT_VALUE" })
      .min(0, { message: "INVALID_DISCOUNT_VALUE" })
      .max(10_000_000, { message: "INVALID_DISCOUNT_VALUE" }),
  })
  .strict("INVALID_DISCOUNT_SHAPE");

const percentDiscount = z
  .object({
    type: z.literal("percent"),
    percent: percentValue,
  })
  .strict("INVALID_DISCOUNT_SHAPE");

// BR-2: a Discount is inexpresable with keys from both forms, and `type` must
// be a known literal. The custom errorMap on the outer union surfaces the
// generic "Invalid input" message as INVALID_DISCOUNT_SHAPE whenever no
// variant matches (e.g. an unknown `type`, a payload with keys from both
// forms that strict-rejects every variant, etc.).
const DiscountSchema = z.union(
  [z.null(), fixedDiscount, percentDiscount],
  { errorMap: () => ({ message: "INVALID_DISCOUNT_SHAPE" }) },
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

// BR-13: `status` must not be patchable. Declaring the field as `z.never()`
// causes any non-undefined value to surface as STATUS_NOT_PATCHABLE
// (via `invalid_type_error`); `.optional()` allows the key to be absent.
export const PatchDocumentSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    customer: z.string().trim().min(1).max(200).optional(),
    issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    status: z
      .never({ invalid_type_error: "STATUS_NOT_PATCHABLE" })
      .optional(),
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
    discount: DiscountSchema.optional(),
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
