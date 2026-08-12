"use client";

import Link from "next/link";
import Badge from "../../../components/Badge";
import Table, { type TableColumn } from "../../../components/Table";
import { formatCents } from "../../../lib/money";
import type { DocumentSummaryResponse } from "../../../lib/types";

interface Props {
  items: DocumentSummaryResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const linkBase =
  "inline-flex items-center justify-center rounded-[6px] px-3 py-1.5 text-sm font-medium border transition-colors";
const linkEnabled =
  "bg-bg-subtle text-text border-border-strong hover:bg-bg";
const linkDisabled =
  "bg-bg text-text-muted border-border opacity-50 pointer-events-none";

export default function DocumentsTable({
  items,
  page,
  limit,
  total,
  totalPages,
}: Props) {
  const prevPage = page > 1 ? page - 1 : null;
  const nextPage = page < totalPages ? page + 1 : null;
  const startIdx = (page - 1) * limit;

  const docLink = (doc: DocumentSummaryResponse, content: React.ReactNode) => (
    <Link href={`/documents/${doc.id}`} className="hover:underline">
      {content}
    </Link>
  );

  const columns: TableColumn<DocumentSummaryResponse>[] = [
    { header: "Title", render: (doc) => docLink(doc, doc.title) },
    { header: "Customer", render: (doc) => docLink(doc, doc.customer) },
    { header: "Issue date", render: (doc) => docLink(doc, doc.issueDate) },
    {
      header: "Status",
      render: (doc) => docLink(doc, <Badge status={doc.status} />),
    },
    {
      header: "Grand total",
      align: "right",
      render: (doc) => docLink(doc, formatCents(doc.grandTotalCents)),
    },
  ];

  return (
    <div className="py-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text">Documents</h1>
        <Link
          href="/documents/new"
          className="inline-flex items-center justify-center gap-2 rounded-[6px] px-4 py-2 text-sm font-medium bg-accent text-white border border-transparent hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          New document
        </Link>
      </div>

      <Table
        columns={columns}
        rows={items}
        getRowKey={(doc) => doc.id}
        emptyMessage="No documents on this page."
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">
          {items.length === 0
            ? `0 of ${total}`
            : `Showing ${startIdx + 1}–${startIdx + items.length} of ${total}`}
        </p>
        <div className="flex items-center gap-2">
          {prevPage !== null ? (
            <Link
              href={`/documents?page=${prevPage}&limit=${limit}`}
              className={`${linkBase} ${linkEnabled}`}
            >
              Previous
            </Link>
          ) : (
            <span className={`${linkBase} ${linkDisabled}`}>Previous</span>
          )}
          <span className="text-sm text-text-muted px-2">
            Page {page} of {totalPages}
          </span>
          {nextPage !== null ? (
            <Link
              href={`/documents?page=${nextPage}&limit=${limit}`}
              className={`${linkBase} ${linkEnabled}`}
            >
              Next
            </Link>
          ) : (
            <span className={`${linkBase} ${linkDisabled}`}>Next</span>
          )}
        </div>
      </div>
    </div>
  );
}