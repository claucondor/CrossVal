import mongoose from "mongoose";
import { DocumentModel, type DocumentDoc } from "../models/document.model";

export interface NewDocumentInput {
  title: string;
  customer: string;
  issueDate: Date;
  lines: unknown[];
  subtotalCents: number;
  totalDiscountCents: number;
  totalTaxCents: number;
  grandTotalCents: number;
}

export interface DraftPatch {
  title?: string;
  customer?: string;
  issueDate?: Date;
  lines?: unknown[];
  subtotalCents?: number;
  totalDiscountCents?: number;
  totalTaxCents?: number;
  grandTotalCents?: number;
}

export interface SummaryTotals {
  documentCount: number;
  grandTotalCents: number;
  totalTaxCents: number;
  totalDiscountCents: number;
}

export type WriteOutcome<T> =
  | { kind: "updated"; doc: T }
  | { kind: "not_found" }
  | { kind: "finalized" };

export interface DocumentRepository {
  create(userId: string, doc: NewDocumentInput): Promise<DocumentDoc>;
  findOneForUser(userId: string, id: string): Promise<DocumentDoc | null>;
  listForUser(userId: string): Promise<DocumentDoc[]>;
  updateDraft(
    userId: string,
    id: string,
    patch: DraftPatch,
  ): Promise<WriteOutcome<DocumentDoc>>;
  deleteDraft(userId: string, id: string): Promise<WriteOutcome<null>>;
  finalize(userId: string, id: string): Promise<WriteOutcome<DocumentDoc>>;
  summary(userId: string, from: Date, to: Date): Promise<SummaryTotals>;
}

export class MongoDocumentRepository implements DocumentRepository {
  async create(userId: string, doc: NewDocumentInput): Promise<DocumentDoc> {
    const created = await DocumentModel.create({
      ...doc,
      userId,
    });
    return created.toObject() as DocumentDoc;
  }

  async findOneForUser(userId: string, id: string): Promise<DocumentDoc | null> {
    try {
      const doc = await DocumentModel.findOne({ _id: id, userId });
      if (!doc) return null;
      return doc.toObject() as DocumentDoc;
    } catch (err) {
      if (err instanceof mongoose.Error.CastError) {
        return null;
      }
      throw err;
    }
  }

  listForUser(userId: string): Promise<DocumentDoc[]> {
    return DocumentModel.find({ userId })
      .sort({ issueDate: -1, createdAt: -1 })
      .lean()
      .exec() as unknown as Promise<DocumentDoc[]>;
  }

  async updateDraft(
    userId: string,
    id: string,
    patch: DraftPatch,
  ): Promise<WriteOutcome<DocumentDoc>> {
    const updated = await DocumentModel.findOneAndUpdate(
      { _id: id, userId, status: "draft" },
      patch,
      { new: true, runValidators: true },
    );
    if (updated) {
      return { kind: "updated", doc: updated.toObject() as DocumentDoc };
    }
    const existing = await DocumentModel.findOne({ _id: id, userId }).select("status");
    if (!existing) {
      return { kind: "not_found" };
    }
    return { kind: "finalized" };
  }

  async deleteDraft(userId: string, id: string): Promise<WriteOutcome<null>> {
    const deleted = await DocumentModel.findOneAndDelete({
      _id: id,
      userId,
      status: "draft",
    });
    if (deleted) {
      return { kind: "updated", doc: null };
    }
    const existing = await DocumentModel.findOne({ _id: id, userId }).select("status");
    if (!existing) {
      return { kind: "not_found" };
    }
    return { kind: "finalized" };
  }

  async finalize(userId: string, id: string): Promise<WriteOutcome<DocumentDoc>> {
    const updated = await DocumentModel.findOneAndUpdate(
      { _id: id, userId, status: "draft" },
      { status: "finalized" },
      { new: true, runValidators: true },
    );
    if (updated) {
      return { kind: "updated", doc: updated.toObject() as DocumentDoc };
    }
    const existing = await DocumentModel.findOne({ _id: id, userId }).select("status");
    if (!existing) {
      return { kind: "not_found" };
    }
    return { kind: "finalized" };
  }

  async summary(userId: string, from: Date, to: Date): Promise<SummaryTotals> {
    const result = await DocumentModel.aggregate<{
      documentCount: number;
      grandTotalCents: number;
      totalTaxCents: number;
      totalDiscountCents: number;
    }>([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          issueDate: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: null,
          documentCount: { $sum: 1 },
          grandTotalCents: { $sum: "$grandTotalCents" },
          totalTaxCents: { $sum: "$totalTaxCents" },
          totalDiscountCents: { $sum: "$totalDiscountCents" },
        },
      },
    ]);
    const row = result[0];
    if (!row) {
      return {
        documentCount: 0,
        grandTotalCents: 0,
        totalTaxCents: 0,
        totalDiscountCents: 0,
      };
    }
    return {
      documentCount: row.documentCount,
      grandTotalCents: row.grandTotalCents,
      totalTaxCents: row.totalTaxCents,
      totalDiscountCents: row.totalDiscountCents,
    };
  }
}
