"use client";

import Link from "next/link";
import Input from "../../../components/Input";
import Button from "../../../components/Button";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-text">Log in</h1>
          <p className="text-sm text-text-muted mt-1">
            Welcome back to CrossVal.
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
            required
            autoComplete="current-password"
          />
          <Button type="submit">Log in</Button>
        </form>
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