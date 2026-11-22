"use client";

import { useActionState } from "react";
import { pridejKanalAkce } from "@/actions/admin";
import { idleState } from "@/lib/form-state";
import { VyberOboru } from "@/components/vybery";
import {
  ErrorBox,
  Field,
  SuccessBox,
  buttonClass,
  inputClass,
} from "@/components/ui";

export function PridatKanalForm() {
  const [state, action, pending] = useActionState(pridejKanalAkce, idleState);

  return (
    <form action={action} key={state.status === "success" ? "reset" : "form"}>
      {state.status === "error" && state.message ? (
        <ErrorBox>{state.message}</ErrorBox>
      ) : null}
      {state.status === "success" && state.message ? (
        <SuccessBox>{state.message}</SuccessBox>
      ) : null}

      <Field
        label="Odkaz na kanál"
        htmlFor="odkaz"
        hint="Musí obsahovat ID kanálu (/channel/UC…). Přezdívku /@nazev lze změnit, ID ne."
        error={state.errors?.odkaz}
      >
        <input
          id="odkaz"
          name="odkaz"
          required
          placeholder="https://www.youtube.com/channel/UC…"
          defaultValue={state.values?.odkaz}
          className={inputClass}
        />
      </Field>

      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label="Název kanálu" htmlFor="nazev" error={state.errors?.nazev}>
          <input
            id="nazev"
            name="nazev"
            required
            defaultValue={state.values?.nazev}
            className={inputClass}
          />
        </Field>

        <Field label="Hlavní obor" htmlFor="obor" error={state.errors?.obor}>
          <VyberOboru defaultValue={state.values?.obor} />
        </Field>
      </div>

      <Field
        label="Proč kanálu věříš"
        htmlFor="poznamka"
        hint="Zveřejňuje se. Je to to jediné, co má čtenář k dispozici — na rozdíl od značky u videa tady není podepsaná recenze."
        error={state.errors?.poznamka}
      >
        <textarea
          id="poznamka"
          name="poznamka"
          rows={3}
          defaultValue={state.values?.poznamka}
          className={inputClass}
          placeholder="Uvádí zdroje v popisu, opravuje chyby v komentářích, spolupracuje s odborníky…"
        />
      </Field>

      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Ukládám…" : "Označit jako důvěryhodný"}
      </button>
    </form>
  );
}
