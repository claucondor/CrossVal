import type { Request, Response } from "express";
import { ERROR_STATUS } from "../../../application/errors";
import type { DocumentService } from "../../../application/documents/document.service.types";
import { toDocumentListResponse, toDocumentResponse } from "../mappers/document.mapper";

export interface DocumentController {
  list(req: Request, res: Response): Promise<void>;
  create(req: Request, res: Response): Promise<void>;
  getOne(req: Request, res: Response): Promise<void>;
  patch(req: Request, res: Response): Promise<void>;
  delete(req: Request, res: Response): Promise<void>;
  addLine(req: Request, res: Response): Promise<void>;
  patchLine(req: Request, res: Response): Promise<void>;
  deleteLine(req: Request, res: Response): Promise<void>;
  finalize(req: Request, res: Response): Promise<void>;
  duplicate(req: Request, res: Response): Promise<void>;
}

export function createDocumentController(documentService: DocumentService): DocumentController {
  return {
    async list(req, res): Promise<void> {
      const { page, limit } = req.query as unknown as { page: number; limit: number };
      const result = await documentService.list(req.user!.id, page, limit);
      if (result.isErr()) {
        res.status(ERROR_STATUS[result.error.code]).json({ error: result.error });
        return;
      }
      res.status(200).json(toDocumentListResponse(result.value));
    },

    async create(req, res): Promise<void> {
      const result = await documentService.create(req.user!.id, req.body);
      if (result.isErr()) {
        res.status(ERROR_STATUS[result.error.code]).json({ error: result.error });
        return;
      }
      res.status(201).json(toDocumentResponse(result.value));
    },

    async getOne(req, res): Promise<void> {
      const result = await documentService.findOne(req.user!.id, req.params.id);
      if (result.isErr()) {
        res.status(ERROR_STATUS[result.error.code]).json({ error: result.error });
        return;
      }
      res.status(200).json(toDocumentResponse(result.value));
    },

    async patch(req, res): Promise<void> {
      const result = await documentService.patch(req.user!.id, req.params.id, req.body);
      if (result.isErr()) {
        res.status(ERROR_STATUS[result.error.code]).json({ error: result.error });
        return;
      }
      res.status(200).json(toDocumentResponse(result.value));
    },

    async delete(req, res): Promise<void> {
      const result = await documentService.delete(req.user!.id, req.params.id);
      if (result.isErr()) {
        res.status(ERROR_STATUS[result.error.code]).json({ error: result.error });
        return;
      }
      res.status(204).end();
    },

    async addLine(req, res): Promise<void> {
      const result = await documentService.addLine(req.user!.id, req.params.id, req.body);
      if (result.isErr()) {
        res.status(ERROR_STATUS[result.error.code]).json({ error: result.error });
        return;
      }
      res.status(201).json(toDocumentResponse(result.value));
    },

    async patchLine(req, res): Promise<void> {
      const result = await documentService.patchLine(
        req.user!.id,
        req.params.id,
        req.params.lineId,
        req.body,
      );
      if (result.isErr()) {
        res.status(ERROR_STATUS[result.error.code]).json({ error: result.error });
        return;
      }
      res.status(200).json(toDocumentResponse(result.value));
    },

    async deleteLine(req, res): Promise<void> {
      const result = await documentService.deleteLine(
        req.user!.id,
        req.params.id,
        req.params.lineId,
      );
      if (result.isErr()) {
        res.status(ERROR_STATUS[result.error.code]).json({ error: result.error });
        return;
      }
      res.status(200).json(toDocumentResponse(result.value));
    },

    async finalize(req, res): Promise<void> {
      const result = await documentService.finalize(req.user!.id, req.params.id);
      if (result.isErr()) {
        res.status(ERROR_STATUS[result.error.code]).json({ error: result.error });
        return;
      }
      res.status(200).json(toDocumentResponse(result.value));
    },

    async duplicate(req, res): Promise<void> {
      const result = await documentService.duplicate(req.user!.id, req.params.id);
      if (result.isErr()) {
        res.status(ERROR_STATUS[result.error.code]).json({ error: result.error });
        return;
      }
      res.status(201).json(toDocumentResponse(result.value));
    },
  };
}
