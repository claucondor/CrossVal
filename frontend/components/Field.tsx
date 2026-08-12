"use client";

import type { ReactNode } from "react";

interface Props {
  label: string;
  error?: string;
  children: ReactNode;
}

export default function Field({ label, error, children }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[13px] font-label text-text">{label}</label>
      {children}
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
