import type { DocumentResponse } from "../../../../lib/types";
import Badge from "../../../../components/Badge";
import DocumentTotals from "../../../../components/DocumentTotals";
import { formatCents } from "../../../../lib/money";
import PrintButton from "./PrintButton";

// Vista imprimible. NO está bajo el grupo (app) — está al nivel raíz de
// `app/documents/[id]/print/`. Eso evita que herede la cabecera superior del
// layout de (app). La URL sigue siendo `/documents/[id]/print`, idéntica a
// antes del movimiento; los `<Link>` que apuntan ahí no necesitan cambios.

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

export default async function PrintDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  void params;
  const doc = getMockDocument();

  return (
    <div className="print-root p-8 max-w-3xl mx-auto text-text">
      <div className="no-print mb-6 flex items-center justify-end gap-2">
        <PrintButton />
      </div>

      <header className="mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold">{doc.title}</h1>
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
        <h2 className="text-sm font-medium text-text-muted mb-2">Lines</h2>
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
