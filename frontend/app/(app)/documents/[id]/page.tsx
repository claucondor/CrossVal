"use client";

import { useState } from "react";
import Link from "next/link";
import Input from "../../../../components/Input";
import Button from "../../../../components/Button";
import Badge from "../../../../components/Badge";
import ConfirmDialog from "../../../../components/ConfirmDialog";
import LineItemEditor from "../../../../components/LineItemEditor";
import DocumentTotals from "../../../../components/DocumentTotals";
import { formatCents } from "../../../../lib/money";
import type {
  DocumentResponse,
  LineItemInput,
  LineItemResponse,
} from "../../../../lib/types";

// Mock fijo. El detalle siempre muestra el mismo documento, sin importar el
// id recibido (per la spec de C6b). Para ver el camino "finalized" en el
// futuro bastará con cambiar `status` a "finalized" o partir en dos mocks
// por id — la lógica de lectura/edición ya está escrita.
function getMockDocument(): DocumentResponse {
  return {
    id: "doc_002",
    title: "Design retainer — Globex",
    customer: "Globex Inc.",
    issueDate: "2026-02-01",
    status: "draft",
    lines: [
      {
        id: "line_001",
        description: "Brand exploration workshop",
        quantity: 2,
        unitPriceCents: 25000,
        discount: null,
        taxPercent: 7.5,
        lineSubtotalCents: 50000,
        discountAmountCents: 0,
        taxAmountCents: 3750,
        lineTotalCents: 53750,
      },
      {
        id: "line_002",
        description: "Logo concepts",
        quantity: 5,
        unitPriceCents: 6000,
        discount: { type: "fixed", amountCents: 5000 },
        taxPercent: 7.5,
        lineSubtotalCents: 30000,
        discountAmountCents: 5000,
        taxAmountCents: 1875,
        lineTotalCents: 26875,
      },
      {
        id: "line_003",
        description: "Style guide and tokens",
        quantity: 1,
        unitPriceCents: 18000,
        discount: { type: "percent", percent: 10 },
        taxPercent: 7.5,
        lineSubtotalCents: 18000,
        discountAmountCents: 1800,
        taxAmountCents: 1215,
        lineTotalCents: 17415,
      },
    ],
    subtotalCents: 98000,
    totalDiscountCents: 6800,
    totalTaxCents: 6840,
    grandTotalCents: 98040,
    createdAt: "2026-02-01T09:30:00.000Z",
    updatedAt: "2026-02-01T09:30:00.000Z",
  };
}

// Mock separado para probar el camino de solo lectura. Si en una fase futura
// el id "doc_001" debe mostrar un documento finalizado, basta con ramificar
// aquí.
function getMockFinalizedDocument(): DocumentResponse {
  return {
    ...getMockDocument(),
    id: "doc_001",
    title: "Q1 services — Acme Corp",
    customer: "Acme Corp",
    issueDate: "2026-01-15",
    status: "finalized",
  };
}

function toLineInput(line: LineItemResponse): LineItemInput {
  return {
    description: line.description,
    quantity: line.quantity,
    unitPriceCents: line.unitPriceCents,
    discount: line.discount,
    taxPercent: line.taxPercent,
  };
}

type DialogKind = "finalize" | "delete" | "duplicate" | null;

export default function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  void params;
  const initialDoc = getMockDocument();
  const [doc, setDoc] = useState<DocumentResponse>(initialDoc);
  const [dialog, setDialog] = useState<DialogKind>(null);

  const isDraft = doc.status === "draft";

  const handleLineChange = (idx: number, next: LineItemInput) => {
    if (!isDraft) return;
    setDoc((prev) => ({
      ...prev,
      lines: prev.lines.map((l, i) =>
        i === idx
          ? {
              ...l,
              description: next.description,
              quantity: next.quantity,
              unitPriceCents: next.unitPriceCents,
              discount: next.discount ?? null,
              taxPercent: next.taxPercent ?? 0,
            }
          : l,
      ),
    }));
  };

  const handleLineRemove = (idx: number) => {
    if (!isDraft) return;
    setDoc((prev) => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== idx),
    }));
  };

  const handleAddLine = () => {
    if (!isDraft) return;
    setDoc((prev) => ({
      ...prev,
      lines: [
        ...prev.lines,
        {
          id: `line_${Date.now()}`,
          description: "",
          quantity: 1,
          unitPriceCents: 0,
          discount: null,
          taxPercent: 0,
          lineSubtotalCents: 0,
          discountAmountCents: 0,
          taxAmountCents: 0,
          lineTotalCents: 0,
        },
      ],
    }));
  };

  const closeDialog = () => setDialog(null);

  // No-op actions — backend wiring is a later phase.
  const handleConfirm = () => {
    closeDialog();
  };

  // Para probar el camino de solo lectura sin cambiar el mock por defecto,
  // expongo un toggle local (no es parte del SDD, es solo utilidad de dev).
  const toggleMockToFinalized = () => {
    setDoc(getMockFinalizedDocument());
  };
  const toggleMockToDraft = () => {
    setDoc(getMockDocument());
  };

  return (
    <div className="p-6 flex flex-col gap-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/documents"
            className="text-sm text-text-muted hover:underline"
          >
            Documents
          </Link>
          <span className="text-text-muted">/</span>
          <h1 className="text-2xl font-semibold text-text">{doc.title}</h1>
          <Badge status={doc.status} />
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/documents/${doc.id}/print`}
            className="inline-flex items-center justify-center rounded-[6px] px-3 py-1.5 text-sm font-medium border border-border-strong bg-bg-subtle text-text hover:bg-bg"
          >
            Print view
          </Link>
        </div>
      </div>

      {!isDraft ? (
        <div className="border border-border bg-bg-subtle rounded-[6px] px-4 py-3 text-sm text-text-muted">
          This document is finalized and can no longer be edited.
        </div>
      ) : null}

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium text-text-muted">Metadata</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Title"
            value={doc.title}
            disabled={!isDraft}
            onChange={(e) =>
              isDraft ? setDoc({ ...doc, title: e.target.value }) : undefined
            }
          />
          <Input
            label="Customer"
            value={doc.customer}
            disabled={!isDraft}
            onChange={(e) =>
              isDraft
                ? setDoc({ ...doc, customer: e.target.value })
                : undefined
            }
          />
          <Input
            type="date"
            label="Issue date"
            value={doc.issueDate}
            disabled={!isDraft}
            onChange={(e) =>
              isDraft
                ? setDoc({ ...doc, issueDate: e.target.value })
                : undefined
            }
          />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-text-muted">Lines</h2>
          {isDraft ? (
            <Button variant="secondary" onClick={handleAddLine}>
              Add line
            </Button>
          ) : null}
        </div>

        {isDraft ? (
          <>
            <div className="grid grid-cols-12 gap-2 text-xs text-text-muted px-1">
              <div className="col-span-3">Description</div>
              <div className="col-span-1">Qty</div>
              <div className="col-span-2">Unit price</div>
              <div className="col-span-2">Discount</div>
              <div className="col-span-2">Disc. value</div>
              <div className="col-span-1">Tax %</div>
              <div className="col-span-1" />
            </div>
            {doc.lines.map((line, idx) => (
              <LineItemEditor
                key={line.id}
                line={toLineInput(line)}
                onChange={(next) => handleLineChange(idx, next)}
                onRemove={() => handleLineRemove(idx)}
              />
            ))}
          </>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg-subtle">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">
                    Description
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-text-muted">
                    Qty
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-text-muted">
                    Unit price
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-text-muted">
                    Tax %
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-text-muted">
                    Line total
                  </th>
                </tr>
              </thead>
              <tbody>
                {doc.lines.map((line) => (
                  <tr key={line.id} className="border-b border-border">
                    <td className="px-3 py-2 text-text">{line.description}</td>
                    <td className="px-3 py-2 text-right text-text">
                      {line.quantity}
                    </td>
                    <td className="px-3 py-2 text-right text-text tabular-nums-col">
                      {formatCents(line.unitPriceCents)}
                    </td>
                    <td className="px-3 py-2 text-right text-text">
                      {line.taxPercent}
                    </td>
                    <td className="px-3 py-2 text-right text-text tabular-nums-col">
                      {formatCents(line.lineTotalCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2 items-end">
        <div className="w-full max-w-xs">
          <DocumentTotals
            subtotalCents={doc.subtotalCents}
            totalDiscountCents={doc.totalDiscountCents}
            totalTaxCents={doc.totalTaxCents}
            grandTotalCents={doc.grandTotalCents}
          />
        </div>
      </section>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isDraft ? (
            <Button onClick={() => setDialog("finalize")}>Finalize</Button>
          ) : null}
          <Button
            variant="secondary"
            onClick={() => setDialog("duplicate")}
          >
            Duplicate
          </Button>
          <Button variant="danger" onClick={() => setDialog("delete")}>
            Delete
          </Button>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-muted">
          {/*
            Toggle de dev para ver el camino "finalized" sin tocar el mock por
            defecto. NO es parte del contrato del SDD — solo utilidad de
            desarrollo. Lo dejo visible para que el build ejercicio ambas
            ramas de UI.
          */}
          <span>Dev:</span>
          {isDraft ? (
            <button
              type="button"
              onClick={toggleMockToFinalized}
              className="underline hover:text-text"
            >
              switch to finalized mock
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleMockToDraft}
              className="underline hover:text-text"
            >
              switch to draft mock
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={dialog === "finalize"}
        title="Finalize document?"
        description="Once finalized, this document cannot be edited."
        confirmLabel="Finalize"
        onConfirm={handleConfirm}
        onCancel={closeDialog}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        title="Delete document?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleConfirm}
        onCancel={closeDialog}
      />
      <ConfirmDialog
        open={dialog === "duplicate"}
        title="Duplicate document?"
        description="A new draft will be created with the same lines."
        confirmLabel="Duplicate"
        onConfirm={handleConfirm}
        onCancel={closeDialog}
      />
    </div>
  );
}
