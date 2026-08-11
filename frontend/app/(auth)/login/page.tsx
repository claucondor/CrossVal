import Link from "next/link";

import LoginForm from "./LoginForm";

interface LoginPageProps {
  searchParams: Promise<{ expired?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const showExpiredBanner = params.expired === "1";

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-text">Log in</h1>
          <p className="text-sm text-text-muted mt-1">
            Welcome back to CrossVal.
          </p>
        </div>
        {showExpiredBanner ? (
          <p
            role="alert"
            className="text-sm border border-border bg-bg-subtle px-3 py-2 rounded-[6px] text-text"
          >
            Your session expired, please sign in again
          </p>
        ) : null}
        <LoginForm />
        <p className="text-sm text-text-muted">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-accent hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
