"use client";

import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

interface Props extends ComponentProps<"button"> {
  variant?: Variant;
  loading?: boolean;
}

const variantClass: Record<Variant, string> = {
  primary:
    "bg-accent text-white border border-transparent hover:bg-accent-hover",
  secondary:
    "bg-bg-subtle text-text border border-border-strong hover:bg-bg",
  danger:
    "bg-danger text-white border border-transparent hover:opacity-90",
  ghost:
    "bg-transparent text-text border border-transparent hover:bg-bg-subtle",
};

const baseClass =
  "inline-flex items-center justify-center gap-2 rounded-[6px] px-4 py-2 text-sm font-label transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 disabled:cursor-not-allowed";

export default function Button({
  variant = "primary",
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${baseClass} ${variantClass[variant]} ${className ?? ""}`}
      {...rest}
    >
      {loading ? (
        <>
          <span
            aria-hidden="true"
            className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"
          />
          <span className="sr-only">Loading</span>
        </>
      ) : null}
      <span className={loading ? "opacity-70" : undefined}>{children}</span>
    </button>
  );
}
