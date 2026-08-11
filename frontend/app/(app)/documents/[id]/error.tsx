"use client";

import { useEffect } from "react";
import Link from "next/link";
import Button from "../../../../components/Button";

export default function DocumentDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("document detail error:", error);
  }, [error]);

  return (
    <div className="p-12 flex flex-col items-center justify-center text-center gap-4">
      <h2 className="text-lg font-semibold text-text">
        Something went wrong
      </h2>
      <p className="text-sm text-text-muted max-w-md">
        We couldn&apos;t load this document. Please try again.
      </p>
      <div className="flex items-center gap-2">
        <Link
          href="/documents"
          className="inline-flex items-center justify-center rounded-[6px] px-4 py-2 text-sm font-medium border border-border-strong bg-bg-subtle text-text hover:bg-bg"
        >
          Back to documents
        </Link>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
