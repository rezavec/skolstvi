"use client";

import { useActionState } from "react";
import { pridejVideoAkce } from "@/actions/admin";
import { idleState } from "@/lib/form-state";
import { VyberOboru, VyberUrovne } from "@/components/vybery";
import {
  ErrorBox,
  Field,
  SuccessBox,
  buttonClass,
  inputClass,
} from "@/components/ui";

export function PridatVideoForm() {
  const [state, action, pending] = useActionState(pridejVideoAkce, idleState);

  return (
    <form action={action} key={state.status === "success" ? "reset" : "form"}>
      {state.status === "error" && state.message ? (
        <ErrorBox>{state.message}</ErrorBox>
      ) : null}
      {state.status === "success" && state.message ? (
        <SuccessBox>{state.message}</SuccessBox>
      ) : null}

      <Field
        label="Odkaz na video"
        htmlFor="odkaz"
        hint="Stačí zkopírovat z adresního řádku. Název se doplní sám."
        error={state.errors?.odkaz}
      >
        <input
          id="odkaz"
          name="odkaz"
          required
          placeholder="https://www.youtube.com/watch?v=…"
          defaultValue={state.values?.odkaz}
          className={inputClass}
        />
      </Field>

      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field
          label="Obor"
          htmlFor="obor"
          hint="Značku pak může dát jen odborník z tohohle oboru."
          error={state.errors?.obor}
        >
          <VyberOboru defaultValue={state.values?.obor} />
        </Field>

        <Field label="Pro koho" htmlFor="uroven" error={state.errors?.uroven}>
          <VyberUrovne defaultValue={state.values?.uroven ?? "vse"} />
        </Field>
      </div>

      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Přidávám…" : "Přidat do fronty k recenzi"}
      </button>
    </form>
  );
}
