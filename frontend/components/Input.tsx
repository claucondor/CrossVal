"use client";

import { useId, type ComponentProps } from "react";

interface Props extends ComponentProps<"input"> {
  label?: string;
  hint?: string;
  error?: string;
}

const baseInputClass =
  "w-full px-3 py-2 text-sm bg-bg text-text border rounded-[6px] placeholder:text-text-muted focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 disabled:cursor-not-allowed";

export default function Input({
  label,
  hint,
  error,
  id,
  className,
  ...rest
}: Props) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const borderClass = error ? "border-danger" : "border-border";

  return (
    <div className="flex flex-col gap-1">
      {label ? (
        <label
          htmlFor={inputId}
          className="text-[13px] font-label text-text"
        >
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={`${baseInputClass} ${borderClass} ${className ?? ""}`}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={!error && hint ? `${inputId}-hint` : undefined}
        {...rest}
      />
      {hint ? (
        <p
          id={`${inputId}-hint`}
          className="text-xs text-text-muted"
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
