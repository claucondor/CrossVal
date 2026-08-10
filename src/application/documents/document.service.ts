import { err, type Result } from "neverthrow";
import type { AppError } from "../errors";
import type {
  CreateDocumentInput,
  DocumentResult,
  DocumentService,
  DocumentSummaryResult,
  PatchDocumentInput,
  PatchLineInput,
} from "./document.service.types";

const NOT_IMPLEMENTED: AppError = {
  code: "INTERNAL_ERROR",
  message: "not implemented",
};

export const documentService: DocumentService = {
  create(_userId: string, _input: CreateDocumentInput): Promise<Result<DocumentResult, AppError>> {
    return Promise.resolve(err(NOT_IMPLEMENTED));
  },
  findOne(_userId: string, _id: string): Promise<Result<DocumentResult, AppError>> {
    return Promise.resolve(err(NOT_IMPLEMENTED));
  },
  list(_userId: string): Promise<Result<DocumentSummaryResult[], AppError>> {
    return Promise.resolve(err(NOT_IMPLEMENTED));
  },
  patch(
    _userId: string,
    _id: string,
    _patch: PatchDocumentInput,
  ): Promise<Result<DocumentResult, AppError>> {
    return Promise.resolve(err(NOT_IMPLEMENTED));
  },
  delete(_userId: string, _id: string): Promise<Result<null, AppError>> {
    return Promise.resolve(err(NOT_IMPLEMENTED));
  },
  addLine(
    _userId: string,
    _id: string,
    _input: CreateDocumentInput["lines"][number],
  ): Promise<Result<DocumentResult, AppError>> {
    return Promise.resolve(err(NOT_IMPLEMENTED));
  },
  patchLine(
    _userId: string,
    _id: string,
    _lineId: string,
    _patch: PatchLineInput,
  ): Promise<Result<DocumentResult, AppError>> {
    return Promise.resolve(err(NOT_IMPLEMENTED));
  },
  deleteLine(
    _userId: string,
    _id: string,
    _lineId: string,
  ): Promise<Result<DocumentResult, AppError>> {
    return Promise.resolve(err(NOT_IMPLEMENTED));
  },
  finalize(_userId: string, _id: string): Promise<Result<DocumentResult, AppError>> {
    return Promise.resolve(err(NOT_IMPLEMENTED));
  },
  duplicate(_userId: string, _id: string): Promise<Result<DocumentResult, AppError>> {
    return Promise.resolve(err(NOT_IMPLEMENTED));
  },
};
