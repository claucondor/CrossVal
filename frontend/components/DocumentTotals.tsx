"use client";

// TODO: usar formatCents de lib/money.ts (tarea C5). Por ahora mostramos el
// valor crudo en centavos sin dividir por 100 ni hacer ninguna aritmética de
// dinero en el componente. No importar de lib/types.ts (C4 en paralelo).

interface Props {
  subtotalCents: number;
  totalDiscountCents: number;
  totalTaxCents: number;
  grandTotalCents: number;
}

export default function DocumentTotals({
  subtotalCents,
  totalDiscountCents,
  totalTaxCents,
  grandTotalCents,
}: Props) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
      <dt className="text-text-muted">Subtotal</dt>
      <dd className="text-right tabular-nums-col text-text">
        {subtotalCents}
      </dd>

      <dt className="text-text-muted">Discount</dt>
      <dd className="text-right tabular-nums-col text-text">
        {totalDiscountCents}
      </dd>

      <dt className="text-text-muted">Tax</dt>
      <dd className="text-right tabular-nums-col text-text">
        {totalTaxCents}
      </dd>

      <dt className="text-text font-semibold pt-2 border-t border-border">
        Total
      </dt>
      <dd className="text-right tabular-nums-col text-text font-semibold pt-2 border-t border-border">
        {grandTotalCents}
      </dd>
    </dl>
  );
}
