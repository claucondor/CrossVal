import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ApiError } from "./types";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; field?: string } };

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) {
    throw new Error(
      "API_BASE_URL is not configured. Set the API_BASE_URL environment variable on the Next server.",
    );
  }

  const cookieStore = await cookies();
  const session = cookieStore.get("session");

  const headers: HeadersInit = {
    ...(init?.headers ?? {}),
    ...(session ? { Authorization: `Bearer ${session.value}` } : {}),
  };

  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (res.status === 401) {
    cookieStore.delete("session");
    redirect("/login?expired=1");
  }

  const json = (await res.json()) as unknown;

  if (res.ok) {
    return { ok: true, data: json as T };
  }

  const errorBody = (json as ApiError | null)?.error;
  if (!errorBody) {
    return {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Unexpected response from the server.",
      },
    };
  }

  return { ok: false, error: errorBody };
}