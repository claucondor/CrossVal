import Link from "next/link";
import EmptyState from "../../../components/EmptyState";
import { apiFetch } from "../../../lib/api";
import { getErrorMessage } from "../../../lib/error-messages";
import type { DocumentListResponse } from "../../../lib/types";
import DocumentsTable from "./DocumentsTable";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; limit?: string }>;
}) {
  const params = await searchParams;
  const rawPage = parseInt(params.page ?? "1", 10);
  const rawLimit = parseInt(params.limit ?? "20", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  const limit =
    Number.isFinite(rawLimit) && rawLimit >= 1 && rawLimit <= 100
      ? rawLimit
      : 20;

  const result = await apiFetch<DocumentListResponse>(
    `/documents?page=${page}&limit=${limit}`,
  );

  if (!result.ok) {
    return (
      <div className="py-6 flex flex-col gap-4">
        <h1 className="text-2xl font-label tracking-[-0.01em] text-text">Documents</h1>
        <p className="text-sm text-danger">
          {getErrorMessage(result.error.code)}
        </p>
      </div>
    );
  }

  const { items } = result.data;

  if (items.length === 0) {
    return (
      <div className="py-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-label tracking-[-0.01em] text-text">Documents</h1>
        </div>
        <EmptyState
          title="No documents yet"
          description="Get started by creating your first document."
          action={
            <Link
              href="/documents/new"
              className="inline-flex items-center justify-center gap-2 rounded-[6px] px-4 py-2 text-sm font-label bg-accent text-white border border-transparent hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              New document
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <DocumentsTable
      items={items}
      page={result.data.page}
      limit={result.data.limit}
      total={result.data.total}
      totalPages={result.data.totalPages}
    />
  );
}