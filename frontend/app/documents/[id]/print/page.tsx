import Link from "next/link";
import { apiFetch } from "../../../../lib/api";
import { getErrorMessage } from "../../../../lib/error-messages";
import type { DocumentResponse } from "../../../../lib/types";
import Badge from "../../../../components/Badge";
import DocumentTotals from "../../../../components/DocumentTotals";
import { formatCents } from "../../../../lib/money";
import PrintButton from "./PrintButton";

// Vista imprimible. NO está bajo el grupo (app) — está al nivel raíz de
// `app/documents/[id]/print/`. Eso evita que herede la cabecera superior del
// layout de (app). La URL sigue siendo `/documents/[id]/print`, idéntica a
// antes del movimiento; los `<Link>` que apuntan ahí no necesitan cambios.

export default async function PrintDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await apiFetch<DocumentResponse>(`/documents/${id}`);

  if (!result.ok) {
    return (
      <div className="print-root p-8 max-w-3xl mx-auto text-text">
        <div className="no-print mb-6 flex items-center justify-end gap-2">
          <Link
            href="/documents"
            className="inline-flex items-center justify-center rounded-[6px] px-3 py-1.5 text-sm font-label border border-border-strong bg-bg-subtle text-text hover:bg-bg"
          >
            Back to documents
          </Link>
          <PrintButton />
        </div>
        <div
          role="alert"
          className="border border-danger rounded-[6px] px-4 py-3 text-sm text-danger bg-bg-subtle"
        >
          {getErrorMessage(result.error.code)}
        </div>
      </div>
    );
  }

  const doc = result.data;

  return (
    <div className="print-root p-8 max-w-3xl mx-auto text-text">
      <div className="no-print mb-6 flex items-center justify-end gap-2">
        <PrintButton />
      </div>

      <header className="mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-label">{doc.title}</h1>
          <Badge status={doc.status} />
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <dt className="text-text-muted">Customer</dt>
          <dd className="text-text">{doc.customer}</dd>
          <dt className="text-text-muted">Issue date</dt>
          <dd className="text-text">{doc.issueDate}</dd>
          <dt className="text-text-muted">Document ID</dt>
          <dd className="text-text">{doc.id}</dd>
        </dl>
      </header>

      <section className="mb-8">
        <h2 className="text-sm font-label text-text-muted mb-2">Lines</h2>
        <table className="w-full text-sm">
          <thead className="bg-bg-subtle">
            <tr>
              <th className="px-3 py-2 text-left font-label text-text-muted">
                Description
              </th>
              <th className="px-3 py-2 text-right font-label text-text-muted">
                Qty
              </th>
              <th className="px-3 py-2 text-right font-label text-text-muted">
                Unit price
              </th>
              <th className="px-3 py-2 text-right font-label text-text-muted">
                Tax %
              </th>
              <th className="px-3 py-2 text-right font-label text-text-muted">
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
                <td className="px-3 py-2 text-right text-text tabular-nums-col font-mono">
                  {formatCents(line.unitPriceCents)}
                </td>
                <td className="px-3 py-2 text-right text-text font-mono">
                  {line.taxPercent}
                </td>
                <td className="px-3 py-2 text-right text-text tabular-nums-col font-mono">
                  {formatCents(line.lineTotalCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="flex justify-end">
        <div className="w-full max-w-xs">
          <DocumentTotals
            subtotalCents={doc.subtotalCents}
            totalDiscountCents={doc.totalDiscountCents}
            totalTaxCents={doc.totalTaxCents}
            grandTotalCents={doc.grandTotalCents}
          />
        </div>
      </section>
    </div>
  );
}
