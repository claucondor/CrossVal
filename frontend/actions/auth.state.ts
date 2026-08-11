export interface AuthActionState {
  error: { code: string; message: string; field?: string } | null;
}

export const initialAuthActionState: AuthActionState = { error: null };
