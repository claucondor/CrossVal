import Link from "next/link";
import EmptyState from "../../../components/EmptyState";
import Input from "../../../components/Input";
import Button from "../../../components/Button";
import { apiFetch } from "../../../lib/api";
import { getErrorMessage } from "../../../lib/error-messages";
import { formatCents } from "../../../lib/money";
import type { SummaryReportResponse } from "../../../lib/types";

type DateShortcut = { label: string; from: string; to: string };

function formatUtcDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getDateRangeShortcuts(now: Date): DateShortcut[] {
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const todayStr = formatUtcDate(today);
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();

  return [
    {
      label: "This month",
      from: formatUtcDate(new Date(Date.UTC(y, m, 1))),
      to: todayStr,
    },
    {
      label: "Last month",
      from: formatUtcDate(new Date(Date.UTC(y, m - 1, 1))),
      to: formatUtcDate(new Date(Date.UTC(y, m, 0))),
    },
    {
      label: "Last 3 months",
      from: formatUtcDate(new Date(Date.UTC(y, m - 2, 1))),
      to: todayStr,
    },
    {
      label: "Year to date",
      from: formatUtcDate(new Date(Date.UTC(y, 0, 1))),
      to: todayStr,
    },
    {
      label: "Last year",
      from: formatUtcDate(new Date(Date.UTC(y - 1, 0, 1))),
      to: formatUtcDate(new Date(Date.UTC(y - 1, 11, 31))),
    },
  ];
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const from = params.from ?? "";
  const to = params.to ?? "";
  const noRange = from === "" || to === "";

  const shortcuts = getDateRangeShortcuts(new Date());

  const result = noRange
    ? null
    : await apiFetch<SummaryReportResponse>(
        `/reports/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      );

  return (
    <div className="py-6 flex flex-col gap-6">
      <h1 className="text-2xl font-label tracking-[-0.01em] text-text">Reports</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-8 items-start">
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-label text-text-muted">Date range</h2>
          <div className="flex flex-wrap items-center gap-2">
            {shortcuts.map((s) => {
              const isActive = from === s.from && to === s.to;
              const className = isActive
                ? "inline-flex items-center justify-center rounded-[6px] px-3 py-1.5 text-[13px] font-label border border-accent bg-accent text-white"
                : "inline-flex items-center justify-center rounded-[6px] px-3 py-1.5 text-[13px] font-label border border-border-strong bg-bg-subtle text-text hover:bg-bg";
              return (
                <Link
                  key={s.label}
                  href={`/reports?from=${s.from}&to=${s.to}`}
                  className={className}
                >
                  {s.label}
                </Link>
              );
            })}
          </div>
          <form
            method="get"
            action="/reports"
            className="flex flex-wrap items-end gap-4"
          >
            <Input type="date" name="from" label="From" defaultValue={from} />
            <Input type="date" name="to" label="To" defaultValue={to} />
            <Button type="submit">Generate</Button>
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
