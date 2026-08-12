"use client";

import { useId, type ComponentProps } from "react";

interface Option {
  value: string;
  label: string;
}

interface Props
  extends Omit<ComponentProps<"select">, "children"> {
  options: Option[];
  label?: string;
  error?: string;
}

const baseSelectClass =
  "w-full px-3 py-2 text-sm bg-bg text-text border rounded-[6px] focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 disabled:cursor-not-allowed";

export default function Select({
  options,
  label,
  error,
  id,
  className,
  ...rest
}: Props) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const borderClass = error ? "border-danger" : "border-border";

  return (
    <div className="flex flex-col gap-1">
      {label ? (
        <label
          htmlFor={selectId}
          className="text-[13px] font-label text-text"
        >
          {label}
        </label>
      ) : null}
      <select
        id={selectId}
        className={`${baseSelectClass} ${borderClass} ${className ?? ""}`}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${selectId}-error` : undefined}
        {...rest}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error ? (
        <p
          id={`${selectId}-error`}
          className="text-xs text-danger"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
