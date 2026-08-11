"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Input from "../../../../components/Input";
import Button from "../../../../components/Button";
import LineItemEditor from "../../../../components/LineItemEditor";
import DocumentTotals from "../../../../components/DocumentTotals";
import { createDocumentAction } from "../../../../actions/document.actions";
import type { LineItemInput } from "../../../../lib/types";

function emptyLine(): LineItemInput {
  return {
    description: "",
    quantity: 1,
    unitPriceCents: 0,
    discount: null,
    taxPercent: 0,
  };
}

export default function NewDocumentPage() {
  const [title, setTitle] = useState("");
  const [customer, setCustomer] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [lines, setLines] = useState<LineItemInput[]>([emptyLine()]);
  const [error, setError] = useState<{
    code: string;
    message: string;
    field?: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAddLine = () => {
    setLines((prev) => [...prev, emptyLine()]);
  };

  const handleLineChange = (index: number, next: LineItemInput) => {
    setLines((prev) => prev.map((l, i) => (i === index ? next : l)));
  };

  const handleLineRemove = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await createDocumentAction({
        title,
        customer,
        issueDate,
        lines,
      });
      if (result?.error) {
        setError(result.error);
      }
    });
  };

  const titleFieldError = error?.field === "title" ? error.message : undefined;
  const customerFieldError =
    error?.field === "customer" ? error.message : undefined;
  const issueDateFieldError =
    error?.field === "issueDate" ? error.message : undefined;
  const globalError =
    error && !error.field ? error.message : null;
  const lineError =
    error?.field && error.field.startsWith("lines[") ? error.message : null;
  const bannerError = globalError ?? lineError;

  return (
    <div className="p-6 flex flex-col gap-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text">New document</h1>
        <Link
          href="/documents"
          className="text-sm text-text-muted hover:underline"
        >
          Back to documents
        </Link>
      </div>

      {bannerError ? (
        <div
          role="alert"
          className="border border-danger rounded-[6px] px-4 py-3 text-sm text-danger bg-bg-subtle"
        >
          {bannerError}
        </div>
      ) : null}

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium text-text-muted">Metadata</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={titleFieldError}
          />
          <Input
            label="Customer"
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            error={customerFieldError}
          />
          <Input
            type="date"
            label="Issue date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            error={issueDateFieldError}
          />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-text-muted">Lines</h2>
          <Button variant="secondary" onClick={handleAddLine}>
            Add line
          </Button>
        </div>
        <div className="grid grid-cols-12 gap-2 text-xs text-text-muted px-1">
          <div className="col-span-3">Description</div>
          <div className="col-span-1">Qty</div>
          <div className="col-span-2">Unit price</div>
          <div className="col-span-2">Discount</div>
          <div className="col-span-2">Disc. value</div>
          <div className="col-span-1">Tax %</div>
          <div className="col-span-1" />
        </div>
        {lines.length === 0 ? (
          <p className="text-sm text-text-muted py-4">
            No lines yet. Click &quot;Add line&quot; to start.
          </p>
        ) : (
          lines.map((line, idx) => (
            <LineItemEditor
              key={idx}
              line={line}
              onChange={(next) => handleLineChange(idx, next)}
              onRemove={() => handleLineRemove(idx)}
            />
          ))
        )}
      </section>

      <section className="flex flex-col gap-2 items-end">
        <p className="text-xs text-text-muted">
          Totals shown below are placeholders. Real totals are returned by the
          server after save (§4.3).
        </p>
        <div className="w-full max-w-xs">
          <DocumentTotals
            subtotalCents={0}
            totalDiscountCents={0}
            totalTaxCents={0}
            grandTotalCents={0}
          />
        </div>
      </section>

      <div className="flex items-center justify-end gap-2">
        <Link
          href="/documents"
          className="inline-flex items-center justify-center rounded-[6px] px-4 py-2 text-sm font-medium border border-border-strong bg-bg-subtle text-text hover:bg-bg"
        >
          Cancel
        </Link>
        <Button onClick={handleSave} loading={isPending}>
          Save
        </Button>
      </div>
    </div>
  );
}
