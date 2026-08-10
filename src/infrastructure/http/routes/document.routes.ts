import { Router } from "express";
import { asyncHandler } from "../asyncHandler";
import type { DocumentController } from "../controllers/document.controller";
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

export function createDocumentRouter(controller: DocumentController): Router {
  const router = Router();

  router.use(authMiddleware);

  router.get("/", asyncHandler(controller.list));

  router.post(
    "/",
    validate("body", CreateDocumentSchema),
    asyncHandler(controller.create),
  );

  router.get(
    "/:id",
    validate("params", DocumentIdParamSchema),
    asyncHandler(controller.getOne),
  );

  router.patch(
    "/:id",
    validate("params", DocumentIdParamSchema),
    validate("body", PatchDocumentSchema),
    asyncHandler(controller.patch),
  );

  router.delete(
    "/:id",
    validate("params", DocumentIdParamSchema),
    asyncHandler(controller.delete),
  );

  router.post(
    "/:id/lines",
    validate("params", DocumentIdParamSchema),
    validate("body", CreateLineSchema),
    asyncHandler(controller.addLine),
  );

  router.patch(
    "/:id/lines/:lineId",
    validate("params", DocumentLineParamsSchema),
    validate("body", PatchLineSchema),
    asyncHandler(controller.patchLine),
  );

  router.delete(
    "/:id/lines/:lineId",
    validate("params", DocumentLineParamsSchema),
    asyncHandler(controller.deleteLine),
  );

  router.post(
    "/:id/finalize",
    validate("params", DocumentIdParamSchema),
    asyncHandler(controller.finalize),
  );

  router.post(
    "/:id/duplicate",
    validate("params", DocumentIdParamSchema),
    asyncHandler(controller.duplicate),
  );

  return router;
}
