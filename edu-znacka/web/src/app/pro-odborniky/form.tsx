"use client";

import { useActionState } from "react";
import { posliOdkaz } from "@/actions/prihlaseni";
import { idleState } from "@/lib/form-state";
import {
  ErrorBox,
  Field,
  SuccessBox,
  buttonClass,
  inputClass,
} from "@/components/ui";

export function OdkazForm({ domenyPopis }: { domenyPopis: string }) {
  const [state, action, pending] = useActionState(posliOdkaz, idleState);

  if (state.status === "success") {
    return <SuccessBox>{state.message}</SuccessBox>;
  }

  return (
    <form action={action}>
      {state.status === "error" && state.message ? (
        <ErrorBox>{state.message}</ErrorBox>
      ) : null}

      <Field
        label="Akademický e-mail"
        htmlFor="email"
        hint={`Pošleme na něj přihlašovací odkaz. Přijímáme ${domenyPopis}. Adresa se nikde nezveřejňuje.`}
        error={state.errors?.email}
      >
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="jmeno@mff.cuni.cz"
          defaultValue={state.values?.email}
          className={inputClass}
        />
      </Field>

      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Posílám…" : "Poslat přihlašovací odkaz"}
      </button>
    </form>
  );
}
