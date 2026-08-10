import { Router } from "express";
import { reportController } from "../controllers/report.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { ReportSummaryQuerySchema } from "../validators/report.schema";

export const reportRouter = Router();

reportRouter.use(authMiddleware);

reportRouter.get(
  "/summary",
  validate("query", ReportSummaryQuerySchema),
  (req, res, next) => {
    try {
      reportController.summary(req, res);
    } catch (e) {
      next(e);
    }
  },
);