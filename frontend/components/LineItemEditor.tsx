"use client";

// TODO: usar formatCents/parseCentsInput de lib/money.ts (tarea C5).
// Por ahora los importes se muestran y editan como string en centavos
// sin aritmética de dinero en el componente (prohibido parseFloat(x)*100
// o cualquier operación de dinero aquí). No importar de lib/types.ts
// (esa tarea es C4, en paralelo).

import Input from "./Input";
import Select from "./Select";
import Button from "./Button";

// Forma local de la línea de documento (alineada con LineItemInput de
// backend-sdd.md §5.2). Re-declarada aquí para no depender de lib/types.ts.
type DiscountDto =
  | null
  | { type: "fixed"; amountCents: number }
  | { type: "percent"; percent: number };

interface LocalLine {
  description: string;
  quantity: number;
  unitPriceCents: number;
  discount: DiscountDto;
  taxPercent: number;
}

interface Props {
  line: LocalLine;
  onChange: (line: LocalLine) => void;
  onRemove: () => void;
}

type DiscountType = "none" | "fixed" | "percent";

const discountOptions: { value: DiscountType; label: string }[] = [
  { value: "none", label: "No discount" },
  { value: "fixed", label: "Fixed" },
  { value: "percent", label: "Percent" },
];

export default function LineItemEditor({
  line,
  onChange,
  onRemove,
}: Props) {
  const discountType: DiscountType =
    line.discount === null ? "none" : line.discount.type;

  const handleDiscountTypeChange = (newType: string) => {
    if (newType === "none") {
      onChange({ ...line, discount: null });
    } else if (newType === "fixed") {
      onChange({
        ...line,
        discount: { type: "fixed", amountCents: 0 },
      });
    } else if (newType === "percent") {
      onChange({
        ...line,
        discount: { type: "percent", percent: 0 },
      });
    }
  };

  const handleDiscountValueChange = (newValue: string) => {
    if (line.discount?.type === "fixed") {
      onChange({
        ...line,
        discount: {
          type: "fixed",
          amountCents: parseInt(newValue, 10) || 0,
        },
      });
    } else if (line.discount?.type === "percent") {
      onChange({
        ...line,
        discount: {
          type: "percent",
          percent: parseFloat(newValue) || 0,
        },
      });
    }
  };

  const discountValue =
    line.discount === null
      ? ""
      : line.discount.type === "fixed"
        ? String(line.discount.amountCents)
        : String(line.discount.percent);

  return (
    <div className="grid grid-cols-12 gap-2 items-end py-3 border-b border-border">
      <div className="col-span-3">
        <Input
          aria-label="Description"
          value={line.description}
          onChange={(e) =>
            onChange({ ...line, description: e.target.value })
          }
        />
      </div>
      <div className="col-span-1">
        <Input
          type="number"
          min={1}
          aria-label="Quantity"
          value={line.quantity}
          onChange={(e) =>
            onChange({
              ...line,
              quantity: parseInt(e.target.value, 10) || 0,
            })
          }
        />
      </div>
      <div className="col-span-2">
        <Input
          type="text"
          inputMode="numeric"
          aria-label="Unit price (cents)"
          value={String(line.unitPriceCents)}
          onChange={(e) =>
            onChange({
              ...line,
              unitPriceCents: parseInt(e.target.value, 10) || 0,
            })
          }
        />
      </div>
      <div className="col-span-2">
        <Select
          aria-label="Discount type"
          value={discountType}
          onChange={(e) => handleDiscountTypeChange(e.target.value)}
          options={discountOptions}
        />
      </div>
      <div className="col-span-2">
        {line.discount ? (
          <Input
            type="text"
            inputMode="decimal"
            aria-label="Discount value"
            value={discountValue}
            onChange={(e) => handleDiscountValueChange(e.target.value)}
          />
        ) : null}
      </div>
      <div className="col-span-1">
        <Input
          type="number"
          step="0.01"
          min={0}
          max={100}
          aria-label="Tax percent"
          value={line.taxPercent}
          onChange={(e) =>
            onChange({
              ...line,
              taxPercent: parseFloat(e.target.value) || 0,
            })
          }
        />
      </div>
      <div className="col-span-1 flex justify-end">
        <Button
          variant="ghost"
          onClick={onRemove}
          aria-label="Remove line"
          className="px-2 py-1"
        >
          <span aria-hidden="true">×</span>
        </Button>
      </div>
    </div>
  );
}
