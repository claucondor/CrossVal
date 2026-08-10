import { ok, type Result } from "neverthrow";
import type { DocumentRepository } from "../../infrastructure/db/repositories/document.repository";
import type { AppError } from "../errors";
import type { ReportService, SummaryReportResult } from "./report.service.types";

export function createReportService(repository: DocumentRepository): ReportService {
  return {
    async summary(
      userId: string,
      from: string,
      to: string,
    ): Promise<Result<SummaryReportResult, AppError>> {
      const fromDate = new Date(`${from}T00:00:00.000Z`);
      const toDate = new Date(`${to}T23:59:59.999Z`);
      const totals = await repository.summary(userId, fromDate, toDate);
      return ok({
        from,
        to,
        documentCount: totals.documentCount,
        grandTotalCents: totals.grandTotalCents,
        totalTaxCents: totals.totalTaxCents,
        totalDiscountCents: totals.totalDiscountCents,
      });
    },
  };
}
