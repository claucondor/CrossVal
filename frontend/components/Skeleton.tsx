"use client";

interface Props {
  className?: string;
}

export default function Skeleton({ className }: Props) {
  return (
    <div
      className={`bg-bg-subtle animate-pulse rounded-[6px] ${className ?? ""}`}
      aria-hidden="true"
    />
  );
}
