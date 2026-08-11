"use client";

import { useActionState } from "react";
import { signupAction } from "../../../actions/auth.actions";
import { initialAuthActionState } from "../../../actions/auth.state";
import Button from "../../../components/Button";
import Input from "../../../components/Input";

export default function SignupForm() {
  const [state, formAction, isPending] = useActionState(
    signupAction,
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
        hint="At least 8 characters"
        required
        minLength={8}
        autoComplete="new-password"
        error={passwordFieldError}
      />
      {globalError ? (
        <p role="alert" className="text-xs text-danger">
          {globalError}
        </p>
      ) : null}
      <Button type="submit" loading={isPending}>
        Sign up
      </Button>
    </form>
  );
}
