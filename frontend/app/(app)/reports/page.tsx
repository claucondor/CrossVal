import EmptyState from "../../../components/EmptyState";
import Input from "../../../components/Input";
import Button from "../../../components/Button";
import { apiFetch } from "../../../lib/api";
import { getErrorMessage } from "../../../lib/error-messages";
import { formatCents } from "../../../lib/money";
import type { SummaryReportResponse } from "../../../lib/types";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const from = params.from ?? "";
  const to = params.to ?? "";
  const noRange = from === "" || to === "";

  const result = noRange
    ? null
    : await apiFetch<SummaryReportResponse>(
        `/reports/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      );

  return (
    <div className="py-6 flex flex-col gap-6">
      <h1 className="text-2xl font-label tracking-[-0.01em] text-text">Reports</h1>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-label text-text-muted">Date range</h2>
        <form method="get" action="/reports" className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md">
            <Input type="date" name="from" label="From" defaultValue={from} />
            <Input type="date" name="to" label="To" defaultValue={to} />
          </div>
          <div>
            <Button type="submit">Generate</Button>
          </div>
        </form>
      </section>

      <section>
        {noRange ? (
          <EmptyState
            title="No report yet"
            description="Pick a date range and click Generate to view metrics."
          />
        ) : result === null ? null : !result.ok ? (
          <p className="text-sm text-danger">
            {getErrorMessage(result.error.code)}
          </p>
        ) : (
          <ReportView report={result.data} />
        )}
      </section>
    </div>
  );
}

function ReportView({ report }: { report: SummaryReportResponse }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-muted">
        {report.from || "—"} → {report.to || "—"}
      </p>
      <div className="border border-border rounded-[6px] p-4 max-w-md flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-label uppercase text-text-muted">
            Grand total
          </span>
          <span className="text-[32px] font-mono font-body text-text">
            {formatCents(report.grandTotalCents)}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm border-t border-border pt-3">
          <div className="flex flex-col gap-1">
            <span className="text-text-muted">Document count</span>
            <span className="text-text tabular-nums">{report.documentCount}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-text-muted">Total tax</span>
            <span className="text-text font-mono tabular-nums">
              {formatCents(report.totalTaxCents)}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-text-muted">Total discount</span>
            <span className="text-text font-mono tabular-nums">
              {formatCents(report.totalDiscountCents)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
