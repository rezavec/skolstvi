"use client";

import { useActionState } from "react";
import { ulozRecenziAkce } from "@/actions/recenzent";
import { hodnotaPole, useKlicFormulare } from "@/components/formulare";
import { idleState } from "@/lib/form-state";
import { VERDIKTY } from "@/lib/obory";
import {
  ErrorBox,
  Field,
  SuccessBox,
  buttonClass,
  inputClass,
} from "@/components/ui";

export function RecenzeForm({
  youtubeId,
  obor,
  oborLabel,
  vychozi,
}: {
  youtubeId: string;
  obor: string;
  oborLabel: string;
  vychozi: { verdikt: string; zduvodneni: string; zdroje: string | null } | null;
}) {
  const [state, action, pending] = useActionState(ulozRecenziAkce, idleState);

  // Viz components/formulare.ts — bez přemountování by se po chybě ve
  // zdůvodnění ztratil vybraný verdikt a formulář by kvůli `required`
  // nešlo odeslat.
  const klicFormulare = useKlicFormulare(state);
  const verdikt = hodnotaPole(state, "verdikt", vychozi?.verdikt ?? "");

  return (
    <form action={action} key={klicFormulare}>
      {state.status === "error" && state.message ? (
        <ErrorBox>{state.message}</ErrorBox>
      ) : null}
      {state.status === "success" && state.message ? (
        <SuccessBox>{state.message}</SuccessBox>
      ) : null}

      <input type="hidden" name="youtubeId" value={youtubeId} />
      {/* Obor je dán zařazením videa, ne volbou recenzenta — jinak by
          se dal obejít smysl pravidla „odborník z oboru“. */}
      <input type="hidden" name="obor" value={obor} />

      <fieldset className="mb-5">
        <legend className="mb-1.5 block text-sm font-medium">
          Odpovídá obsah videa současnému konsenzu v oboru {oborLabel}?
        </legend>
        <div className="space-y-2">
          {(Object.keys(VERDIKTY) as (keyof typeof VERDIKTY)[]).map((klic) => (
            <label
              key={klic}
              className="flex items-start gap-2.5 rounded-lg border border-line bg-background p-3 text-sm"
            >
              <input
                type="radio"
                name="verdikt"
                value={klic}
                required
                defaultChecked={verdikt === klic}
                className="mt-0.5 h-4 w-4 shrink-0"
              />
              <span>
                <strong>{VERDIKTY[klic].label}</strong>
                {klic === "neodpovida" ? (
                  <span className="mt-0.5 block text-xs text-muted">
                    Video značku nedostane. <strong>Nikde se nezveřejní</strong>,
                    že neprošlo — uvidí to jen správce a ostatní recenzenti,
                    aby stejnou práci nedělali dvakrát.
                  </span>
                ) : null}
              </span>
            </label>
          ))}
        </div>
        {state.errors?.verdikt ? (
          <p className="mt-1.5 text-xs text-red-700 dark:text-red-400">
            {state.errors.verdikt}
          </p>
        ) : null}
      </fieldset>

      <Field
        label="Zdůvodnění"
        htmlFor="zduvodneni"
        hint="U kladného verdiktu je veřejné a je u značky vidět. Stojí na něm její hodnota — napiš konkrétně, co jsi posuzoval. Zjednodušení není chyba; otázka je, jestli si z videa člověk odnese něco nesprávného."
        error={state.errors?.zduvodneni}
      >
        <textarea
          id="zduvodneni"
          name="zduvodneni"
          rows={6}
          required
          minLength={30}
          defaultValue={state.values?.zduvodneni ?? vychozi?.zduvodneni ?? ""}
          className={inputClass}
        />
      </Field>

      <Field
        label="Zdroje"
        htmlFor="zdroje"
        hint="Nepovinné, ale cenné. Učebnice, přehledový článek, DOI — cokoli, podle čeho si to může čtenář dohledat."
        error={state.errors?.zdroje}
      >
        <textarea
          id="zdroje"
          name="zdroje"
          rows={3}
          defaultValue={state.values?.zdroje ?? vychozi?.zdroje ?? ""}
          className={inputClass}
        />
      </Field>

      <button type="submit" disabled={pending} className={buttonClass}>
        {pending
          ? "Ukládám…"
          : vychozi
            ? "Uložit změny v posudku"
            : "Podepsat a odeslat posudek"}
      </button>
    </form>
  );
}
