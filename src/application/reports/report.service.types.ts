import type { Result } from "neverthrow";
import type { AppError } from "../errors";

export interface SummaryReportResult {
  from: string;
  to: string;
  documentCount: number;
  grandTotalCents: number;
  totalTaxCents: number;
  totalDiscountCents: number;
}

export interface ReportService {
  summary(
    userId: string,
    from: string,
    to: string,
  ): Promise<Result<SummaryReportResult, AppError>>;
}