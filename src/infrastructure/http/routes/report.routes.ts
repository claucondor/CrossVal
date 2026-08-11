import { Router } from "express";
import { asyncHandler } from "../asyncHandler";
import type { ReportController } from "../controllers/report.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { generalRateLimit } from "../middlewares/rate-limit.middleware";
import { validate } from "../middlewares/validate.middleware";
import { ReportSummaryQuerySchema } from "../validators/report.schema";

export function createReportRouter(controller: ReportController): Router {
  const router = Router();

  router.use(generalRateLimit);
  router.use(authMiddleware);

  router.get(
    "/summary",
    validate("query", ReportSummaryQuerySchema),
    asyncHandler(controller.summary),
  );

  return router;
}
