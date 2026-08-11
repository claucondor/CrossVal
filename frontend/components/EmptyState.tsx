"use client";

import type { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export default function EmptyState({
  title,
  description,
  action,
  icon,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      {icon ? (
        <div className="mb-4 text-text-muted">{icon}</div>
      ) : null}
      <h3 className="text-base font-semibold text-text mb-1">
        {title}
      </h3>
      {description ? (
        <p className="text-sm text-text-muted mb-4 max-w-md">
          {description}
        </p>
      ) : null}
      {action}
    </div>
  );
}
