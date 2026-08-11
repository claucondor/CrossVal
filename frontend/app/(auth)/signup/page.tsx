import Link from "next/link";

import SignupForm from "./SignupForm";

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-text">
            Create your account
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Start tracking documents with CrossVal.
          </p>
        </div>
        <SignupForm />
        <p className="text-sm text-text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
