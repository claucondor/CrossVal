import { formatCents } from "../lib/money";

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
    <div className="w-full max-w-xs border border-border rounded-[6px] p-4">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-text-muted">Subtotal</dt>
        <dd className="text-right tabular-nums-col text-text">
          {formatCents(subtotalCents)}
        </dd>

        <dt className="text-text-muted">Discount</dt>
        <dd className="text-right tabular-nums-col text-text">
          {formatCents(totalDiscountCents)}
        </dd>

        <dt className="text-text-muted">Tax</dt>
        <dd className="text-right tabular-nums-col text-text">
          {formatCents(totalTaxCents)}
        </dd>

        <dt className="text-text font-semibold pt-2 border-t border-border-strong">
          Total
        </dt>
        <dd className="text-right tabular-nums-col text-text font-semibold pt-2 border-t border-border-strong">
          {formatCents(grandTotalCents)}
        </dd>
      </dl>
    </div>
  );
}