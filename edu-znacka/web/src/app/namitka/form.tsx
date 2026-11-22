"use client";

import { useActionState } from "react";
import { podejNamitkuAkce } from "@/actions/namitka";
import { jeZaskrtnuto, useKlicFormulare } from "@/components/formulare";
import { idleState } from "@/lib/form-state";
import {
  ErrorBox,
  Field,
  SuccessBox,
  buttonClass,
  inputClass,
} from "@/components/ui";

export function NamitkaForm({ youtubeId }: { youtubeId: string }) {
  const [state, action, pending] = useActionState(podejNamitkuAkce, idleState);

  // Viz components/formulare.ts.
  const klicFormulare = useKlicFormulare(state);
  const jeAutor = jeZaskrtnuto(state, "jeAutor", false);

  if (state.status === "success") {
    return <SuccessBox>{state.message}</SuccessBox>;
  }

  return (
    <form action={action} key={klicFormulare}>
      {state.status === "error" && state.message ? (
        <ErrorBox>{state.message}</ErrorBox>
      ) : null}

      <Field
        label="ID nebo odkaz na video"
        htmlFor="youtubeId"
        error={state.errors?.youtubeId}
      >
        <input
          id="youtubeId"
          name="youtubeId"
          required
          defaultValue={state.values?.youtubeId ?? youtubeId}
          placeholder="https://www.youtube.com/watch?v=…"
          className={inputClass}
        />
      </Field>

      <Field
        label="Co je ve videu špatně"
        htmlFor="text"
        hint="Napiš konkrétně — ideálně i čas ve videu a proč to tak není. Obecná námitka („je to celé blbě“) se nedá vyřídit."
        error={state.errors?.text}
      >
        <textarea
          id="text"
          name="text"
          rows={6}
          required
          minLength={30}
          defaultValue={state.values?.text}
          className={inputClass}
        />
      </Field>

      <Field
        label="Tvůj e-mail"
        htmlFor="kontakt"
        hint="Pošleme na něj, jak se to vyřídilo. Nikde se nezveřejňuje."
        error={state.errors?.kontakt}
      >
        <input
          id="kontakt"
          name="kontakt"
          type="email"
          inputMode="email"
          required
          defaultValue={state.values?.kontakt}
          className={inputClass}
        />
      </Field>

      <div className="mb-5">
        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            name="jeAutor"
            defaultChecked={jeAutor}
            className="mt-0.5 h-4 w-4 shrink-0"
          />
          <span>
            Jsem autor toho videa. <span className="text-muted">
              Takové námitky vyřizujeme první.
            </span>
          </span>
        </label>
      </div>

      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Posílám…" : "Podat námitku"}
      </button>
    </form>
  );
}
