"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { apiFetch } from "../lib/api";
import { getErrorMessage } from "../lib/error-messages";
import type {
  AuthResponse,
  LoginRequest,
  SignupRequest,
} from "../lib/types";
import type { AuthActionState } from "./auth.state";

const SESSION_COOKIE = "session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;

function extractCredentials(formData: FormData): {
  email: string;
  password: string;
} {
  return {
    email: formData.get("email")?.toString() ?? "",
    password: formData.get("password")?.toString() ?? "",
  };
}

function toActionError(error: {
  code: string;
  message: string;
  field?: string;
}): AuthActionState {
  return {
    error: { ...error, message: getErrorMessage(error.code) },
  };
}

export async function signupAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const credentials = extractCredentials(formData);

  const result = await apiFetch<AuthResponse>("/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials satisfies SignupRequest),
  });

  if (!result.ok) {
    return toActionError(result.error);
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, result.data.token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });

  redirect("/documents");
}

export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const credentials = extractCredentials(formData);

  const result = await apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials satisfies LoginRequest),
  });

  if (!result.ok) {
    return toActionError(result.error);
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, result.data.token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });

  redirect("/documents");
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}
