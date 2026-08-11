"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { apiFetch } from "../lib/api";
import { getErrorMessage } from "../lib/error-messages";
import type {
  CreateDocumentRequest,
  DocumentResponse,
  LineItemInput,
  PatchDocumentRequest,
  PatchLineRequest,
} from "../lib/types";
import type { DocumentActionState } from "./document.state";

function toActionError(error: {
  code: string;
  message: string;
  field?: string;
}): DocumentActionState {
  return {
    error: { ...error, message: getErrorMessage(error.code) },
  };
}

export async function createDocumentAction(input: {
  title: string;
  customer: string;
  issueDate: string;
  lines: LineItemInput[];
}): Promise<DocumentActionState> {
  const result = await apiFetch<DocumentResponse>("/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input satisfies CreateDocumentRequest),
  });

  if (!result.ok) {
    return toActionError(result.error);
  }

  revalidatePath("/documents");
  redirect(`/documents/${result.data.id}`);
}

export async function patchDocumentAction(
  id: string,
  input: PatchDocumentRequest,
): Promise<DocumentActionState> {
  const result = await apiFetch<DocumentResponse>(`/documents/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input satisfies PatchDocumentRequest),
  });

  if (!result.ok) {
    return toActionError(result.error);
  }

  revalidatePath(`/documents/${id}`);
  revalidatePath("/documents");
  return { error: null };
}

export async function addLineAction(
  documentId: string,
  input: LineItemInput,
): Promise<DocumentActionState> {
  const result = await apiFetch<DocumentResponse>(
    `/documents/${documentId}/lines`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input satisfies LineItemInput),
    },
  );

  if (!result.ok) {
    return toActionError(result.error);
  }

  revalidatePath(`/documents/${documentId}`);
  revalidatePath("/documents");
  return { error: null };
}

export async function patchLineAction(
  documentId: string,
  lineId: string,
  input: PatchLineRequest,
): Promise<DocumentActionState> {
  const result = await apiFetch<DocumentResponse>(
    `/documents/${documentId}/lines/${lineId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input satisfies PatchLineRequest),
    },
  );

  if (!result.ok) {
    return toActionError(result.error);
  }

  revalidatePath(`/documents/${documentId}`);
  revalidatePath("/documents");
  return { error: null };
}

export async function deleteLineAction(
  documentId: string,
  lineId: string,
): Promise<DocumentActionState> {
  const result = await apiFetch<DocumentResponse>(
    `/documents/${documentId}/lines/${lineId}`,
    {
      method: "DELETE",
    },
  );

  if (!result.ok) {
    return toActionError(result.error);
  }

  revalidatePath(`/documents/${documentId}`);
  revalidatePath("/documents");
  return { error: null };
}

export async function finalizeDocumentAction(
  documentId: string,
): Promise<DocumentActionState> {
  const result = await apiFetch<DocumentResponse>(
    `/documents/${documentId}/finalize`,
    {
      method: "POST",
    },
  );

  if (!result.ok) {
    return toActionError(result.error);
  }

  revalidatePath(`/documents/${documentId}`);
  revalidatePath("/documents");
  return { error: null };
}

export async function duplicateDocumentAction(
  documentId: string,
): Promise<DocumentActionState> {
  const result = await apiFetch<DocumentResponse>(
    `/documents/${documentId}/duplicate`,
    {
      method: "POST",
    },
  );

  if (!result.ok) {
    return toActionError(result.error);
  }

  revalidatePath("/documents");
  redirect(`/documents/${result.data.id}`);
}

export async function deleteDocumentAction(
  documentId: string,
): Promise<DocumentActionState> {
  // TODO: apiFetch calls `await res.json()` unconditionally, which throws
  // "SyntaxError: Unexpected end of JSON input" on 204 No Content responses.
  // `DELETE /documents/:id` returns 204 with no body per backend-sdd.md §5.1,
  // so this action will surface an unhandled throw from the Server Action
  // instead of a structured DocumentActionState on success. Don't fix in this
  // file — gap against `lib/api.ts` (needs an early
  // `if (res.status === 204) return { ok: true, data: undefined as T }`
  // branch before the json parse, or to switch the parser to handle empty
  // bodies). Tracking separately.
  const result = await apiFetch<void>(`/documents/${documentId}`, {
    method: "DELETE",
  });

  if (!result.ok) {
    return toActionError(result.error);
  }

  revalidatePath("/documents");
  redirect("/documents");
}
