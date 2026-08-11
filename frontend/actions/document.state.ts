export interface DocumentActionState {
  error: { code: string; message: string; field?: string } | null;
}

export const initialDocumentActionState: DocumentActionState = { error: null };
