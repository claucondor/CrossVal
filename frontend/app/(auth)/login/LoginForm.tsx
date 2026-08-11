"use client";

import { useActionState } from "react";
import { loginAction } from "../../../actions/auth.actions";
import { initialAuthActionState } from "../../../actions/auth.state";
import Button from "../../../components/Button";
import Input from "../../../components/Input";

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialAuthActionState,
  );

  const emailFieldError =
    state.error?.field === "email" ? state.error.message : undefined;
  const passwordFieldError =
    state.error?.field === "password" ? state.error.message : undefined;
  const globalError =
    state.error && !state.error.field ? state.error.message : null;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {globalError ? (
        <div
          role="alert"
          className="border border-danger rounded-[6px] px-4 py-3 text-sm text-danger bg-bg-subtle"
        >
          {globalError}
        </div>
      ) : null}
      <Input
        type="email"
        name="email"
        label="Email"
        required
        autoComplete="email"
        error={emailFieldError}
      />
      <Input
        type="password"
        name="password"
        label="Password"
        required
        autoComplete="current-password"
        error={passwordFieldError}
      />
      <Button type="submit" loading={isPending}>
        Log in
      </Button>
    </form>
  );
}
