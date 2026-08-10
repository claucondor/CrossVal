import { Types } from "mongoose";
import { err, ok, type Result } from "neverthrow";
import { percentToBp } from "../../domain/pricing/money";
import { calculateDocument } from "../../domain/pricing/pricing";
import type { Discount, LineInput, LineResult, PricingError } from "../../domain/pricing/pricing.types";
import type { DocumentDoc } from "../../infrastructure/db/models/document.model";
import type {
  DocumentRepository,
  DraftPatch,
  WriteOutcome,
} from "../../infrastructure/db/repositories/document.repository";
import type { AppError } from "../errors";
import type {
  CreateDocumentInput,
  DocumentResult,
  DocumentService,
  DocumentSummaryResult,
  LineDiscountDto,
  LineItemResult,
} from "./document.service.types";

interface StoredLine {
  _id?: Types.ObjectId;
  description: string;
  quantity: number;
  unitPriceCents: number;
  discount: Discount;
  taxBp: number;
  lineSubtotalCents: number;
  discountAmountCents: number;
  taxAmountCents: number;
  lineTotalCents: number;
}

interface LineSource {
  description: string;
  input: LineInput;
  existingId: Types.ObjectId | undefined;
}

function discountDtoToDomain(dto: LineDiscountDto): Discount {
  if (dto === null) return null;
  if (dto.type === "fixed") return { type: "fixed", amountCents: dto.amountCents };
  return { type: "percent", percentBp: percentToBp(dto.percent) };
}

function lineInputDtoToDomain(line: CreateDocumentInput["lines"][number]): LineInput {
  return {
    quantity: line.quantity,
    unitPriceCents: line.unitPriceCents,
    discount: discountDtoToDomain(line.discount),
    taxBp: percentToBp(line.taxPercent),
  };
}

function discountFromDoc(d: DocumentDoc["lines"][number]["discount"]): Discount {
  if (d == null) return null;
  if (d.type === "fixed") return { type: "fixed", amountCents: d.amountCents ?? 0 };
  return { type: "percent", percentBp: d.percentBp ?? 0 };
}

function lineInputFromStored(line: DocumentDoc["lines"][number]): LineInput {
  return {
    quantity: line.quantity,
    unitPriceCents: line.unitPriceCents,
    discount: discountFromDoc(line.discount),
    taxBp: line.taxBp,
  };
}

function buildStoredLine(
  description: string,
  input: LineInput,
  calc: LineResult,
  existingId?: Types.ObjectId,
): StoredLine {
  const line: StoredLine = {
    description,
    quantity: input.quantity,
    unitPriceCents: input.unitPriceCents,
    discount: input.discount,
    taxBp: input.taxBp,
    lineSubtotalCents: calc.lineSubtotalCents,
    discountAmountCents: calc.discountAmountCents,
    taxAmountCents: calc.taxAmountCents,
    lineTotalCents: calc.lineTotalCents,
  };
  if (existingId) line._id = existingId;
  return line;
}

function dateToYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function serialiseLine(line: DocumentDoc["lines"][number]): LineItemResult {
  return {
    id: line._id.toString(),
    description: line.description,
    quantity: line.quantity,
    unitPriceCents: line.unitPriceCents,
    discount: discountFromDoc(line.discount),
    taxBp: line.taxBp,
    lineSubtotalCents: line.lineSubtotalCents,
    discountAmountCents: line.discountAmountCents,
    taxAmountCents: line.taxAmountCents,
    lineTotalCents: line.lineTotalCents,
  };
}

function serialiseDocument(doc: DocumentDoc): DocumentResult {
  return {
    id: doc._id.toString(),
    title: doc.title,
    customer: doc.customer,
    issueDate: dateToYmd(doc.issueDate),
    status: doc.status,
    lines: doc.lines.map(serialiseLine),
    subtotalCents: doc.subtotalCents,
    totalDiscountCents: doc.totalDiscountCents,
    totalTaxCents: doc.totalTaxCents,
    grandTotalCents: doc.grandTotalCents,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function serialiseSummary(doc: DocumentDoc): DocumentSummaryResult {
  return {
    id: doc._id.toString(),
    title: doc.title,
    customer: doc.customer,
    issueDate: dateToYmd(doc.issueDate),
    status: doc.status,
    lineCount: doc.lines.length,
    grandTotalCents: doc.grandTotalCents,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function mapEngineError(err: { lineIndex: number; error: PricingError }): AppError {
  const { lineIndex, error } = err;
  return {
    code: error.code,
    message: error.message,
    field: `lines[${lineIndex}]${error.field ? "." + error.field : ""}`,
  };
}

function mapWriteOutcome(
  outcome: WriteOutcome<DocumentDoc>,
  finalizedCode: "FINALIZED_DOCUMENT_IMMUTABLE" | "DOCUMENT_ALREADY_FINALIZED",
): Result<DocumentResult, AppError> {
  switch (outcome.kind) {
    case "updated":
      return ok(serialiseDocument(outcome.doc));
    case "not_found":
      return err({ code: "DOCUMENT_NOT_FOUND", message: "Document not found" });
    case "finalized":
      return err({
        code: finalizedCode,
        message: "Document is finalized and cannot be modified",
      });
  }
}

export function createDocumentService(repository: DocumentRepository): DocumentService {
  return {
    async create(userId, input): Promise<Result<DocumentResult, AppError>> {
      const lineInputs: LineInput[] = input.lines.map(lineInputDtoToDomain);

      const calc = calculateDocument(lineInputs);
      if (calc.isErr()) {
        return err(mapEngineError(calc.error));
      }
      const { lines: calculatedLines, totals } = calc.value;

      const storedLines: StoredLine[] = input.lines.map((line, i) =>
        buildStoredLine(line.description, lineInputs[i], calculatedLines[i]),
      );

      const created = await repository.create(userId, {
        title: input.title,
        customer: input.customer,
        issueDate: new Date(input.issueDate),
        lines: storedLines,
        subtotalCents: totals.subtotalCents,
        totalDiscountCents: totals.totalDiscountCents,
        totalTaxCents: totals.totalTaxCents,
        grandTotalCents: totals.grandTotalCents,
      });

      return ok(serialiseDocument(created));
    },

    async findOne(userId, id): Promise<Result<DocumentResult, AppError>> {
      const doc = await repository.findOneForUser(userId, id);
      if (!doc) return err({ code: "DOCUMENT_NOT_FOUND", message: "Document not found" });
      return ok(serialiseDocument(doc));
    },

    async list(userId): Promise<Result<DocumentSummaryResult[], AppError>> {
      const docs = await repository.listForUser(userId);
      return ok(docs.map(serialiseSummary));
    },

    async patch(userId, id, patch): Promise<Result<DocumentResult, AppError>> {
      const draftPatch: DraftPatch = {};
      if (patch.title !== undefined) draftPatch.title = patch.title;
      if (patch.customer !== undefined) draftPatch.customer = patch.customer;
      if (patch.issueDate !== undefined) draftPatch.issueDate = new Date(patch.issueDate);

      const outcome = await repository.updateDraft(userId, id, draftPatch);
      return mapWriteOutcome(outcome, "FINALIZED_DOCUMENT_IMMUTABLE");
    },

    async delete(userId, id): Promise<Result<null, AppError>> {
      const outcome = await repository.deleteDraft(userId, id);
      switch (outcome.kind) {
        case "updated":
          return ok(null);
        case "not_found":
          return err({ code: "DOCUMENT_NOT_FOUND", message: "Document not found" });
        case "finalized":
          return err({
            code: "FINALIZED_DOCUMENT_IMMUTABLE",
            message: "Document is finalized and cannot be modified",
          });
      }
    },

    async addLine(userId, id, input): Promise<Result<DocumentResult, AppError>> {
      const current = await repository.findOneForUser(userId, id);
      if (!current) return err({ code: "DOCUMENT_NOT_FOUND", message: "Document not found" });

      const sources: LineSource[] = current.lines.map((storedLine) => ({
        description: storedLine.description,
        input: lineInputFromStored(storedLine),
        existingId: storedLine._id,
      }));
      const newInput = lineInputDtoToDomain(input);
      sources.push({ description: input.description, input: newInput, existingId: undefined });

      const allInputs = sources.map((s) => s.input);
      const calc = calculateDocument(allInputs);
      if (calc.isErr()) {
        return err(mapEngineError(calc.error));
      }
      const { lines: calculatedLines, totals } = calc.value;

      const storedLines: StoredLine[] = sources.map((s, i) =>
        buildStoredLine(s.description, s.input, calculatedLines[i], s.existingId),
      );

      const outcome = await repository.updateDraft(userId, id, {
        lines: storedLines,
        subtotalCents: totals.subtotalCents,
        totalDiscountCents: totals.totalDiscountCents,
        totalTaxCents: totals.totalTaxCents,
        grandTotalCents: totals.grandTotalCents,
      });
      return mapWriteOutcome(outcome, "FINALIZED_DOCUMENT_IMMUTABLE");
    },

    async patchLine(userId, id, lineId, patch): Promise<Result<DocumentResult, AppError>> {
      const current = await repository.findOneForUser(userId, id);
      if (!current) return err({ code: "DOCUMENT_NOT_FOUND", message: "Document not found" });

      const lineIndex = current.lines.findIndex((l) => l._id.toString() === lineId);
      if (lineIndex === -1) {
        return err({ code: "LINE_NOT_FOUND", message: "Line not found" });
      }

      const sources: LineSource[] = current.lines.map((storedLine, i) => {
        if (i !== lineIndex) {
          return {
            description: storedLine.description,
            input: lineInputFromStored(storedLine),
            existingId: storedLine._id,
          };
        }
        const currentInput = lineInputFromStored(storedLine);
        const patchedInput: LineInput = {
          quantity: patch.quantity !== undefined ? patch.quantity : currentInput.quantity,
          unitPriceCents:
            patch.unitPriceCents !== undefined ? patch.unitPriceCents : currentInput.unitPriceCents,
          discount:
            patch.discount !== undefined ? discountDtoToDomain(patch.discount) : currentInput.discount,
          taxBp: patch.taxPercent !== undefined ? percentToBp(patch.taxPercent) : currentInput.taxBp,
        };
        const patchedDescription =
          patch.description !== undefined ? patch.description : storedLine.description;
        return {
          description: patchedDescription,
          input: patchedInput,
          existingId: storedLine._id,
        };
      });

      const allInputs = sources.map((s) => s.input);
      const calc = calculateDocument(allInputs);
      if (calc.isErr()) {
        return err(mapEngineError(calc.error));
      }
      const { lines: calculatedLines, totals } = calc.value;

      const storedLines: StoredLine[] = sources.map((s, i) =>
        buildStoredLine(s.description, s.input, calculatedLines[i], s.existingId),
      );

      const outcome = await repository.updateDraft(userId, id, {
        lines: storedLines,
        subtotalCents: totals.subtotalCents,
        totalDiscountCents: totals.totalDiscountCents,
        totalTaxCents: totals.totalTaxCents,
        grandTotalCents: totals.grandTotalCents,
      });
      return mapWriteOutcome(outcome, "FINALIZED_DOCUMENT_IMMUTABLE");
    },

    async deleteLine(userId, id, lineId): Promise<Result<DocumentResult, AppError>> {
      const current = await repository.findOneForUser(userId, id);
      if (!current) return err({ code: "DOCUMENT_NOT_FOUND", message: "Document not found" });

      const lineIndex = current.lines.findIndex((l) => l._id.toString() === lineId);
      if (lineIndex === -1) {
        return err({ code: "LINE_NOT_FOUND", message: "Line not found" });
      }

      const remaining = current.lines.filter((_, i) => i !== lineIndex);
      const sources: LineSource[] = remaining.map((storedLine) => ({
        description: storedLine.description,
        input: lineInputFromStored(storedLine),
        existingId: storedLine._id,
      }));

      const calc = calculateDocument(sources.map((s) => s.input));
      if (calc.isErr()) {
        return err(mapEngineError(calc.error));
      }
      const { lines: calculatedLines, totals } = calc.value;

      const storedLines: StoredLine[] = sources.map((s, i) =>
        buildStoredLine(s.description, s.input, calculatedLines[i], s.existingId),
      );

      const outcome = await repository.updateDraft(userId, id, {
        lines: storedLines,
        subtotalCents: totals.subtotalCents,
        totalDiscountCents: totals.totalDiscountCents,
        totalTaxCents: totals.totalTaxCents,
        grandTotalCents: totals.grandTotalCents,
      });
      return mapWriteOutcome(outcome, "FINALIZED_DOCUMENT_IMMUTABLE");
    },

    async finalize(userId, id): Promise<Result<DocumentResult, AppError>> {
      const current = await repository.findOneForUser(userId, id);
      if (!current) return err({ code: "DOCUMENT_NOT_FOUND", message: "Document not found" });

      if (current.lines.length === 0) {
        return err({
          code: "DOCUMENT_HAS_NO_LINES",
          message: "Document has no lines and cannot be finalized",
        });
      }
      for (const line of current.lines) {
        if (line.quantity <= 0 || line.unitPriceCents < 0) {
          return err({
            code: "DOCUMENT_HAS_NO_LINES",
            message: "Document has invalid lines and cannot be finalized",
          });
        }
      }

      const outcome = await repository.finalize(userId, id);
      switch (outcome.kind) {
        case "updated":
          return ok(serialiseDocument(outcome.doc));
        case "not_found":
          return err({ code: "DOCUMENT_NOT_FOUND", message: "Document not found" });
        case "finalized":
          return err({
            code: "DOCUMENT_ALREADY_FINALIZED",
            message: "Document is already finalized",
          });
      }
    },

    async duplicate(userId, id): Promise<Result<DocumentResult, AppError>> {
      const source = await repository.findOneForUser(userId, id);
      if (!source) return err({ code: "DOCUMENT_NOT_FOUND", message: "Document not found" });

      const sources: LineSource[] = source.lines.map((storedLine) => ({
        description: storedLine.description,
        input: lineInputFromStored(storedLine),
        existingId: undefined,
      }));

      const calc = calculateDocument(sources.map((s) => s.input));
      if (calc.isErr()) {
        return err(mapEngineError(calc.error));
      }
      const { lines: calculatedLines, totals } = calc.value;

      const storedLines: StoredLine[] = sources.map((s, i) =>
        buildStoredLine(s.description, s.input, calculatedLines[i], s.existingId),
      );

      const created = await repository.create(userId, {
        title: source.title,
        customer: source.customer,
        issueDate: source.issueDate,
        lines: storedLines,
        subtotalCents: totals.subtotalCents,
        totalDiscountCents: totals.totalDiscountCents,
        totalTaxCents: totals.totalTaxCents,
        grandTotalCents: totals.grandTotalCents,
      });
      return ok(serialiseDocument(created));
    },
  };
}
