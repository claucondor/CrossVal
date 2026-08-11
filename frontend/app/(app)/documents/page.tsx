import type { DocumentSummaryResponse } from "../../../lib/types";
import DocumentsTable from "./DocumentsTable";

const MOCK_DOCS: DocumentSummaryResponse[] = [
  {
    id: "doc_001",
    title: "Q1 services — Acme Corp",
    customer: "Acme Corp",
    issueDate: "2026-01-15",
    status: "finalized",
    lineCount: 5,
    grandTotalCents: 125450,
    createdAt: "2026-01-15T10:00:00.000Z",
    updatedAt: "2026-01-15T10:00:00.000Z",
  },
  {
    id: "doc_002",
    title: "Design retainer — Globex",
    customer: "Globex Inc.",
    issueDate: "2026-02-01",
    status: "draft",
    lineCount: 3,
    grandTotalCents: 89000,
    createdAt: "2026-02-01T09:30:00.000Z",
    updatedAt: "2026-02-01T09:30:00.000Z",
  },
  {
    id: "doc_003",
    title: "Mobile app MVP — Initech",
    customer: "Initech LLC",
    issueDate: "2026-02-10",
    status: "draft",
    lineCount: 8,
    grandTotalCents: 2400000,
    createdAt: "2026-02-10T14:15:00.000Z",
    updatedAt: "2026-02-10T14:15:00.000Z",
  },
  {
    id: "doc_004",
    title: "API integration — Umbrella",
    customer: "Umbrella Co.",
    issueDate: "2026-02-22",
    status: "finalized",
    lineCount: 4,
    grandTotalCents: 56250,
    createdAt: "2026-02-22T11:00:00.000Z",
    updatedAt: "2026-02-22T11:00:00.000Z",
  },
  {
    id: "doc_005",
    title: "Maintenance agreement — Stark",
    customer: "Stark Industries",
    issueDate: "2026-03-05",
    status: "draft",
    lineCount: 2,
    grandTotalCents: 1200000,
    createdAt: "2026-03-05T08:00:00.000Z",
    updatedAt: "2026-03-05T08:00:00.000Z",
  },
  {
    id: "doc_006",
    title: "Data migration — Wayne",
    customer: "Wayne Enterprises",
    issueDate: "2026-03-18",
    status: "finalized",
    lineCount: 6,
    grandTotalCents: 875000,
    createdAt: "2026-03-18T16:45:00.000Z",
    updatedAt: "2026-03-18T16:45:00.000Z",
  },
  {
    id: "doc_007",
    title: "Discovery workshop — Hooli",
    customer: "Hooli",
    issueDate: "2026-04-02",
    status: "draft",
    lineCount: 1,
    grandTotalCents: 350000,
    createdAt: "2026-04-02T13:20:00.000Z",
    updatedAt: "2026-04-02T13:20:00.000Z",
  },
  {
    id: "doc_008",
    title: "Annual audit — Pied Piper",
    customer: "Pied Piper",
    issueDate: "2026-04-19",
    status: "finalized",
    lineCount: 10,
    grandTotalCents: 1575000,
    createdAt: "2026-04-19T10:00:00.000Z",
    updatedAt: "2026-04-19T10:00:00.000Z",
  },
];

const MOCK_TOTAL = MOCK_DOCS.length;

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

  const totalPages = Math.max(1, Math.ceil(MOCK_TOTAL / limit));
  const startIdx = (page - 1) * limit;
  const items = MOCK_DOCS.slice(startIdx, startIdx + limit);

  return (
    <DocumentsTable
      items={items}
      page={page}
      limit={limit}
      total={MOCK_TOTAL}
      totalPages={totalPages}
    />
  );
}