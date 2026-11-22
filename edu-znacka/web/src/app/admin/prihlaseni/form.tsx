"use client";

import { useActionState } from "react";
import { prihlasSpravce } from "@/actions/admin";
import { idleState } from "@/lib/form-state";
import { ErrorBox, Field, buttonClass, inputClass } from "@/components/ui";

export function PrihlasovaciForm() {
  const [state, action, pending] = useActionState(prihlasSpravce, idleState);

  return (
    <form action={action}>
      {state.status === "error" && state.message ? (
        <ErrorBox>{state.message}</ErrorBox>
      ) : null}

      <Field label="Heslo" htmlFor="password" error={state.errors?.password}>
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
        {pending ? "Přihlašuju…" : "Přihlásit"}
      </button>
    </form>
  );
}
