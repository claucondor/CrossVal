import type { Request, Response } from "express";
import { ERROR_STATUS } from "../../../application/errors";
import type { ReportService } from "../../../application/reports/report.service.types";

export interface ReportController {
  summary(req: Request, res: Response): Promise<void>;
}

export function createReportController(reportService: ReportService): ReportController {
  return {
    async summary(req, res): Promise<void> {
      const { from, to } = req.query as { from: string; to: string };
      const result = await reportService.summary(req.user!.id, from, to);
      if (result.isErr()) {
        res.status(ERROR_STATUS[result.error.code]).json({ error: result.error });
        return;
      }
      res.status(200).json(result.value);
    },
  };
}
