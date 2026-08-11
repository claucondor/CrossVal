import { notFound } from "next/navigation";

import DocumentDetailView from "./DocumentDetailView";
import { apiFetch } from "../../../../lib/api";
import { getErrorMessage } from "../../../../lib/error-messages";
import type { DocumentResponse } from "../../../../lib/types";

// Server Component. Lee el documento vía API y se lo pasa al Client Component
// que maneja la interactividad. Las mutaciones (patch, add/remove line,
// finalize, duplicate, delete) viven en `actions/document.actions.ts` y
// revalidan este path, así que después de una Server Action exitosa este
// Server Component se vuelve a renderizar con los datos frescos del server
// — no hace falta mantener estado local de React sincronizado a mano.

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await apiFetch<DocumentResponse>(`/documents/${id}`);

  if (!result.ok) {
    if (result.error.code === "DOCUMENT_NOT_FOUND") {
      notFound();
    }
    return (
      <div className="p-6 flex flex-col gap-4 max-w-4xl">
        <h1 className="text-2xl font-semibold text-text">Document</h1>
        <div
          role="alert"
          className="border border-danger rounded-[6px] px-4 py-3 text-sm text-danger bg-bg-subtle"
        >
          {getErrorMessage(result.error.code)}
        </div>
      </div>
    );
  }

  return <DocumentDetailView document={result.data} />;
}
