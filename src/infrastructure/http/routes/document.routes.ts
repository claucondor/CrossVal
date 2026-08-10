import { Router } from "express";
import { documentController } from "../controllers/document.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  CreateDocumentSchema,
  CreateLineSchema,
  DocumentIdParamSchema,
  DocumentLineParamsSchema,
  PatchDocumentSchema,
  PatchLineSchema,
} from "../validators/document.schema";

export const documentRouter = Router();

documentRouter.use(authMiddleware);

documentRouter.get("/", (req, res, next) => {
  try {
    documentController.list(req, res);
  } catch (e) {
    next(e);
  }
});

documentRouter.post(
  "/",
  validate("body", CreateDocumentSchema),
  (req, res, next) => {
    try {
      documentController.create(req, res);
    } catch (e) {
      next(e);
    }
  },
);

documentRouter.get(
  "/:id",
  validate("params", DocumentIdParamSchema),
  (req, res, next) => {
    try {
      documentController.getOne(req, res);
    } catch (e) {
      next(e);
    }
  },
);

documentRouter.patch(
  "/:id",
  validate("params", DocumentIdParamSchema),
  validate("body", PatchDocumentSchema),
  (req, res, next) => {
    try {
      documentController.patch(req, res);
    } catch (e) {
      next(e);
    }
  },
);

documentRouter.delete(
  "/:id",
  validate("params", DocumentIdParamSchema),
  (req, res, next) => {
    try {
      documentController.delete(req, res);
    } catch (e) {
      next(e);
    }
  },
);

documentRouter.post(
  "/:id/lines",
  validate("params", DocumentIdParamSchema),
  validate("body", CreateLineSchema),
  (req, res, next) => {
    try {
      documentController.addLine(req, res);
    } catch (e) {
      next(e);
    }
  },
);

documentRouter.patch(
  "/:id/lines/:lineId",
  validate("params", DocumentLineParamsSchema),
  validate("body", PatchLineSchema),
  (req, res, next) => {
    try {
      documentController.patchLine(req, res);
    } catch (e) {
      next(e);
    }
  },
);

documentRouter.delete(
  "/:id/lines/:lineId",
  validate("params", DocumentLineParamsSchema),
  (req, res, next) => {
    try {
      documentController.deleteLine(req, res);
    } catch (e) {
      next(e);
    }
  },
);

documentRouter.post(
  "/:id/finalize",
  validate("params", DocumentIdParamSchema),
  (req, res, next) => {
    try {
      documentController.finalize(req, res);
    } catch (e) {
      next(e);
    }
  },
);

documentRouter.post(
  "/:id/duplicate",
  validate("params", DocumentIdParamSchema),
  (req, res, next) => {
    try {
      documentController.duplicate(req, res);
    } catch (e) {
      next(e);
    }
  },
);