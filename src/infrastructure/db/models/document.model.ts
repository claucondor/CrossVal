import { Schema, model, type InferSchemaType, type Model, Types } from "mongoose";

const lineItemSchema = new Schema(
  {
    description: { type: String, required: true, trim: true, minlength: 1, maxlength: 200 },
    quantity: { type: Number, required: true, min: 1, max: 10_000, integer: true },
    unitPriceCents: { type: Number, required: true, min: 0, max: 10_000_000, integer: true },
    discount: {
      type: {
        type: String,
        enum: ["fixed", "percent"],
      },
      amountCents: { type: Number, min: 0, integer: true },
      percentBp: { type: Number, min: 0, max: 10_000, integer: true },
    },
    taxBp: { type: Number, required: true, min: 0, max: 10_000, integer: true },

    lineSubtotalCents: { type: Number, required: true, default: 0 },
    discountAmountCents: { type: Number, required: true, default: 0 },
    taxAmountCents: { type: Number, required: true, default: 0 },
    lineTotalCents: { type: Number, required: true, default: 0 },
  },
  { _id: true, versionKey: false },
);

const documentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: 200 },
    customer: { type: String, required: true, trim: true, minlength: 1, maxlength: 200 },
    issueDate: { type: Date, required: true },
    status: { type: String, enum: ["draft", "finalized"], required: true, default: "draft" },
    lines: { type: [lineItemSchema], default: [] },

    subtotalCents: { type: Number, required: true, default: 0 },
    totalDiscountCents: { type: Number, required: true, default: 0 },
    totalTaxCents: { type: Number, required: true, default: 0 },
    grandTotalCents: { type: Number, required: true, default: 0 },
  },
  { timestamps: true, versionKey: false },
);

documentSchema.index({ userId: 1, issueDate: -1 });
documentSchema.index({ userId: 1, status: 1 });

documentSchema.set("toJSON", {
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret.__v;
    return ret;
  },
});

export type DocumentDoc = InferSchemaType<typeof documentSchema> & {
  _id: Types.ObjectId;
};
export const DocumentModel: Model<DocumentDoc> = model<DocumentDoc>("Document", documentSchema);
