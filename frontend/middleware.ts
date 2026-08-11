import { NextResponse } from "next/server";

// Stub. The real route-protection logic (see frontend-sdd §3.3) belongs to
// Fase 1, outside this nightly goal. For now, let every request through.
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};