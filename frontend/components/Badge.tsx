"use client";

type Status = "draft" | "finalized";

interface Props {
  status: Status;
}

export default function Badge({ status }: Props) {
  const isFinalized = status === "finalized";
  const colorClass = isFinalized
    ? "text-success"
    : "text-text-muted";
  const label = isFinalized ? "Finalized" : "Draft";

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-sm ${colorClass}`}
    >
      <span
        aria-hidden="true"
        className="inline-block w-1.5 h-1.5 rounded-full bg-current"
      />
      {label}
    </span>
  );
}
