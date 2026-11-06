"use client";

import { useActionState } from "react";
import { adminLogin } from "@/actions/login";
import { idleState } from "@/lib/form-state";
import {
  Card,
  ErrorBox,
  Field,
  Heading,
  buttonClass,
  inputClass,
} from "@/components/ui";

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(adminLogin, idleState);

  return (
    <>
      <Heading sub="Přehled závad, které mám na starosti.">
        Administrace
      </Heading>

      {state.status === "error" && state.message ? (
        <ErrorBox>{state.message}</ErrorBox>
      ) : null}

      <Card>
        <form action={action} noValidate>
          <Field label="Heslo" htmlFor="password">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              autoFocus
              required
              className={inputClass}
            />
          </Field>

          <button type="submit" disabled={pending} className={buttonClass}>
            {pending ? "Přihlašuji…" : "Přihlásit"}
          </button>
        </form>
      </Card>
    </>
  );
}
