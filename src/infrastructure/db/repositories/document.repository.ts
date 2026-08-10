import type { DocumentDoc } from "../models/document.model";

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
  create(_userId: string, _doc: NewDocumentInput): Promise<DocumentDoc> {
    return Promise.reject(new Error("not implemented"));
  }
  findOneForUser(_userId: string, _id: string): Promise<DocumentDoc | null> {
    return Promise.reject(new Error("not implemented"));
  }
  listForUser(_userId: string): Promise<DocumentDoc[]> {
    return Promise.reject(new Error("not implemented"));
  }
  updateDraft(
    _userId: string,
    _id: string,
    _patch: DraftPatch,
  ): Promise<WriteOutcome<DocumentDoc>> {
    return Promise.reject(new Error("not implemented"));
  }
  deleteDraft(_userId: string, _id: string): Promise<WriteOutcome<null>> {
    return Promise.reject(new Error("not implemented"));
  }
  finalize(_userId: string, _id: string): Promise<WriteOutcome<DocumentDoc>> {
    return Promise.reject(new Error("not implemented"));
  }
  summary(_userId: string, _from: Date, _to: Date): Promise<SummaryTotals> {
    return Promise.reject(new Error("not implemented"));
  }
}
