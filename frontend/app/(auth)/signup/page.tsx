"use client";

import Link from "next/link";
import Input from "../../../components/Input";
import Button from "../../../components/Button";

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
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => e.preventDefault()}
        >
          <Input
            type="email"
            name="email"
            label="Email"
            required
            autoComplete="email"
          />
          <Input
            type="password"
            name="password"
            label="Password"
            hint="At least 8 characters"
            required
            minLength={8}
            autoComplete="new-password"
          />
          <Button type="submit">Sign up</Button>
        </form>
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