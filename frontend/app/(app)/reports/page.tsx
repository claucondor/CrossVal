"use client";

import { useState } from "react";
import Input from "../../../components/Input";
import Button from "../../../components/Button";
import EmptyState from "../../../components/EmptyState";
import { formatCents } from "../../../lib/money";
import type { SummaryReportResponse } from "../../../lib/types";

export default function ReportsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState<SummaryReportResponse | null>(null);

  const handleGenerate = () => {
    // Mock — backend wiring is a later phase. Per la spec de C6b, los
    // importes del reporte vienen del backend en la implementación real.
    setReport({
      from,
      to,
      documentCount: 12,
      grandTotalCents: 524380,
      totalTaxCents: 36475,
      totalDiscountCents: 15800,
    });
  };

  return (
    <div className="p-6 flex flex-col gap-6 max-w-4xl">
      <h1 className="text-2xl font-semibold text-text">Reports</h1>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium text-text-muted">Date range</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md">
          <Input
            type="date"
            label="From"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <Input
            type="date"
            label="To"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div>
          <Button onClick={handleGenerate}>Generate</Button>
        </div>
      </section>

      <section>
        {report === null ? (
          <EmptyState
            title="No report yet"
            description="Pick a date range and click Generate to view metrics."
          />
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text-muted">
              {report.from || "—"} → {report.to || "—"}
            </p>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm border border-border rounded-[6px] p-4 bg-bg-subtle max-w-md">
              <dt className="text-text-muted">Document count</dt>
              <dd className="text-right tabular-nums-col text-text">
                {report.documentCount}
              </dd>

              <dt className="text-text-muted">Grand total</dt>
              <dd className="text-right tabular-nums-col text-text">
                {formatCents(report.grandTotalCents)}
              </dd>

              <dt className="text-text-muted">Total tax</dt>
              <dd className="text-right tabular-nums-col text-text">
                {formatCents(report.totalTaxCents)}
              </dd>

              <dt className="text-text-muted">Total discount</dt>
              <dd className="text-right tabular-nums-col text-text">
                {formatCents(report.totalDiscountCents)}
              </dd>
            </dl>
          </div>
        )}
      </section>
    </div>
  );
}
