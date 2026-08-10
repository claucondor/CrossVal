import { err, type Result } from "neverthrow";
import type { AppError } from "../errors";
import type { ReportService, SummaryReportResult } from "./report.service.types";

export const reportService: ReportService = {
  summary(
    _userId: string,
    _from: string,
    _to: string,
  ): Promise<Result<SummaryReportResult, AppError>> {
    return Promise.resolve(
      err({ code: "INTERNAL_ERROR", message: "not implemented" }),
    );
  },
};