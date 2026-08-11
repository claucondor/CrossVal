"use client";

import { useState } from "react";
import Input from "./Input";
import Select from "./Select";
import Button from "./Button";
import { formatCents, parseCentsInput, parsePercentInput } from "../lib/money";
import type { LineItemInput } from "../lib/types";

interface Props {
  line: LineItemInput;
  onChange: (line: LineItemInput) => void;
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
    line.discount === null || line.discount === undefined
      ? "none"
      : line.discount.type;

  const [discountPercentError, setDiscountPercentError] = useState<string | null>(null);
  const [taxPercentError, setTaxPercentError] = useState<string | null>(null);

  const percentErrorMessage = "Enter a percent between 0 and 100 with up to 2 decimals.";

  const handleDiscountTypeChange = (newType: string) => {
    if (newType === "none") {
      onChange({ ...line, discount: null });
    } else if (newType === "fixed") {
      onChange({
        ...line,
        discount: { type: "fixed", amountCents: line.discount?.type === "fixed" ? line.discount.amountCents : 0 },
      });
    } else if (newType === "percent") {
      onChange({
        ...line,
        discount: { type: "percent", percent: line.discount?.type === "percent" ? line.discount.percent : 0 },
      });
    }
  };

  const handleDiscountValueChange = (newValue: string) => {
    if (line.discount?.type === "fixed") {
      const parsed = parseCentsInput(newValue);
      onChange({
        ...line,
        discount: {
          type: "fixed",
          amountCents: parsed ?? line.discount.amountCents,
        },
      });
    } else if (line.discount?.type === "percent") {
      const parsed = parsePercentInput(newValue);
      if (parsed === null) {
        setDiscountPercentError(percentErrorMessage);
        return;
      }
      setDiscountPercentError(null);
      onChange({
        ...line,
        discount: {
          type: "percent",
          percent: parsed,
        },
      });
    }
  };

  const handleUnitPriceChange = (newValue: string) => {
    const parsed = parseCentsInput(newValue);
    onChange({
      ...line,
      unitPriceCents: parsed ?? line.unitPriceCents,
    });
  };

  const discountValue =
    line.discount === null || line.discount === undefined
      ? ""
      : line.discount.type === "fixed"
        ? formatCents(line.discount.amountCents)
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
          inputMode="decimal"
          aria-label="Unit price"
          value={formatCents(line.unitPriceCents)}
          onChange={(e) => handleUnitPriceChange(e.target.value)}
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
            inputMode={line.discount.type === "fixed" ? "decimal" : "decimal"}
            aria-label="Discount value"
            value={discountValue}
            error={line.discount.type === "percent" ? discountPercentError ?? undefined : undefined}
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
          value={line.taxPercent ?? 0}
          error={taxPercentError ?? undefined}
          onChange={(e) => {
            const parsed = parsePercentInput(e.target.value);
            if (parsed === null) {
              setTaxPercentError(percentErrorMessage);
              return;
            }
            setTaxPercentError(null);
            onChange({
              ...line,
              taxPercent: parsed,
            });
          }}
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