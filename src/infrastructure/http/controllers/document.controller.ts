import type { Request, Response } from "express";
import {
  toDocumentResponse,
  toDocumentSummaryResponse,
  type MockDocumentLike,
} from "../mappers/document.mapper";

const NOT_FOUND_ID = "000000000000000000000404";
const FINALIZED_ID = "000000000000000000000409";

function notFound(res: Response): void {
  res.status(404).json({
    error: { code: "DOCUMENT_NOT_FOUND", message: "Document not found" },
  });
}

function finalized(res: Response): void {
  res.status(409).json({
    error: {
      code: "FINALIZED_DOCUMENT_IMMUTABLE",
      message: "Document is finalized and cannot be modified",
    },
  });
}

const happyMock: MockDocumentLike = {
  id: "000000000000000000000111",
  title: "Sample quote",
  customer: "Acme Corp",
  issueDate: "2025-01-15T00:00:00.000Z",
  status: "draft",
  lines: [
    {
      id: "000000000000000000000aa1",
      description: "Widget A",
      quantity: 2,
      unitPriceCents: 10000,
      discount: { type: "percent", percentBp: 1000 },
      taxBp: 500,
      lineSubtotalCents: 20000,
      discountAmountCents: 2000,
      taxAmountCents: 900,
      lineTotalCents: 18900,
    },
  ],
  subtotalCents: 20000,
  totalDiscountCents: 2000,
  totalTaxCents: 900,
  grandTotalCents: 18900,
  createdAt: "2025-01-10T12:00:00.000Z",
  updatedAt: "2025-01-10T12:00:00.000Z",
};

function checkId(id: string, res: Response): boolean {
  if (id === NOT_FOUND_ID) {
    notFound(res);
    return true;
  }
  if (id === FINALIZED_ID) {
    finalized(res);
    return true;
  }
  return false;
}

export const documentController = {
  list(_req: Request, res: Response): void {
    res.status(200).json([toDocumentSummaryResponse(happyMock)]);
  },

  create(req: Request, res: Response): void {
    res.status(201).json(toDocumentResponse({ ...happyMock, title: (req.body as { title?: string }).title ?? happyMock.title }));
  },

  getOne(req: Request, res: Response): void {
    const id = (req.params as { id: string }).id;
    if (checkId(id, res)) return;
    res.status(200).json(toDocumentResponse(happyMock));
  },

  patch(req: Request, res: Response): void {
    const id = (req.params as { id: string }).id;
    if (checkId(id, res)) return;
    res.status(200).json(toDocumentResponse(happyMock));
  },

  delete(req: Request, res: Response): void {
    const id = (req.params as { id: string }).id;
    if (checkId(id, res)) return;
    res.status(204).end();
  },

  addLine(req: Request, res: Response): void {
    const id = (req.params as { id: string }).id;
    if (checkId(id, res)) return;
    res.status(201).json(toDocumentResponse(happyMock));
  },

  patchLine(req: Request, res: Response): void {
    const id = (req.params as { id: string }).id;
    if (checkId(id, res)) return;
    res.status(200).json(toDocumentResponse(happyMock));
  },

  deleteLine(req: Request, res: Response): void {
    const id = (req.params as { id: string }).id;
    if (checkId(id, res)) return;
    res.status(200).json(toDocumentResponse(happyMock));
  },

  finalize(req: Request, res: Response): void {
    const id = (req.params as { id: string }).id;
    if (checkId(id, res)) return;
    res.status(200).json(toDocumentResponse({ ...happyMock, status: "finalized" }));
  },

  duplicate(req: Request, res: Response): void {
    const id = (req.params as { id: string }).id;
    if (checkId(id, res)) return;
    res.status(201).json(toDocumentResponse({ ...happyMock, status: "draft" }));
  },
};