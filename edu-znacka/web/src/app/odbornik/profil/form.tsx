"use client";

import { useActionState } from "react";
import { ulozProfilAkce } from "@/actions/recenzent";
import {
  hodnotaPole,
  jeZaskrtnuto,
  useKlicFormulare,
  vybranePolozky,
} from "@/components/formulare";
import { idleState } from "@/lib/form-state";
import { OBORY, OBORY_PORADI } from "@/lib/obory";
import {
  ErrorBox,
  Field,
  SuccessBox,
  buttonClass,
  inputClass,
} from "@/components/ui";

export function ProfilForm({
  vychozi,
  prvniVyplneni,
}: {
  vychozi: {
    jmeno: string;
    titul: string | null;
    instituce: string;
    orcid: string | null;
    profilUrl: string | null;
    obory: string[];
    jeSouhlas: boolean;
  };
  prvniVyplneni: boolean;
}) {
  const [state, action, pending] = useActionState(ulozProfilAkce, idleState);

  // React po akci formulář resetuje a zaškrtnutí by se ztratilo —
  // proto se formulář při každém výsledku přemountuje. Důvod i rozbor
  // jsou v components/formulare.ts.
  const klicFormulare = useKlicFormulare(state);

  const obory = vybranePolozky(state, "obory", vychozi.obory);
  const souhlas = jeZaskrtnuto(state, "souhlas", vychozi.jeSouhlas);

  const hodnota = (klic: string, zaloha: string | null) =>
    hodnotaPole(state, klic, zaloha);

  return (
    <form action={action} key={klicFormulare}>
      {state.status === "error" && state.message ? (
        <ErrorBox>{state.message}</ErrorBox>
      ) : null}
      {state.status === "success" && state.message ? (
        <SuccessBox>{state.message}</SuccessBox>
      ) : null}

      <div className="grid gap-x-4 sm:grid-cols-[1fr_2fr]">
        <Field
          label="Titul"
          htmlFor="titul"
          hint="Nepovinné."
          error={state.errors?.titul}
        >
          <input
            id="titul"
            name="titul"
            placeholder="doc. RNDr."
            defaultValue={hodnota("titul", vychozi.titul)}
            className={inputClass}
          />
        </Field>

        <Field
          label="Jméno a příjmení"
          htmlFor="jmeno"
          hint="Veřejné — bude u každé značky, kterou podepíšeš."
          error={state.errors?.jmeno}
        >
          <input
            id="jmeno"
            name="jmeno"
            required
            autoComplete="name"
            defaultValue={hodnota("jmeno", vychozi.jmeno)}
            className={inputClass}
          />
        </Field>
      </div>

      <Field
        label="Instituce"
        htmlFor="instituce"
        hint="Veřejné. Pracoviště, ne jen univerzita — „MFF UK, Ústav teoretické fyziky“."
        error={state.errors?.instituce}
      >
        <input
          id="instituce"
          name="instituce"
          required
          defaultValue={hodnota("instituce", vychozi.instituce)}
          className={inputClass}
        />
      </Field>

      <Field
        label="Odkaz na tvůj profil u instituce"
        htmlFor="profilUrl"
        hint="Podle něj se ověřuje, že na instituci opravdu působíš. Zveřejňuje se."
        error={state.errors?.profilUrl}
      >
        <input
          id="profilUrl"
          name="profilUrl"
          type="url"
          placeholder="https://…"
          defaultValue={hodnota("profilUrl", vychozi.profilUrl)}
          className={inputClass}
        />
      </Field>

      <Field
        label="ORCID iD"
        htmlFor="orcid"
        hint="Nepovinné, ale pomůže — čtenář si podle něj sám najde tvoje publikace. Můžeš vložit i celou adresu z orcid.org."
        error={state.errors?.orcid}
      >
        <input
          id="orcid"
          name="orcid"
          placeholder="0000-0002-1825-0097"
          defaultValue={hodnota("orcid", vychozi.orcid)}
          className={inputClass}
        />
      </Field>

      <fieldset className="mb-5">
        <legend className="mb-1.5 block text-sm font-medium">
          Obory, ve kterých chceš recenzovat
        </legend>
        <p className="mb-2 text-xs text-muted">
          Recenze platí jen pro video zařazené do stejného oboru — fyzik nedává
          značku videu o dědičnosti. Vyber jen to, čím se opravdu zabýváš;
          maximum jsou čtyři.
        </p>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {OBORY_PORADI.map((slug) => (
            <label key={slug} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="obory"
                value={slug}
                defaultChecked={obory.includes(slug)}
                className="h-4 w-4"
              />
              {OBORY[slug]}
            </label>
          ))}
        </div>
        {state.errors?.obory ? (
          <p className="mt-1.5 text-xs text-red-700 dark:text-red-400">
            {state.errors.obory}
          </p>
        ) : null}
      </fieldset>

      <div className="mb-5 rounded-lg border border-line bg-background p-4">
        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            name="souhlas"
            // Schválně BEZ `required`: kdyby se zaškrtnutí po chybě přece
            // jen ztratilo, prohlížeč by odeslání mlčky zablokoval a nikdo
            // by nevěděl proč. Chybějící souhlas hlídá validace na serveru
            // a napíše k tomu srozumitelnou větu.
            defaultChecked={souhlas}
            className="mt-0.5 h-4 w-4 shrink-0"
          />
          <span>
            Souhlasím se <strong>zveřejněním jména, titulu, instituce,
            oborů a odkazů</strong> na mém profilu a u každé značky, kterou
            podepíšu. Beru na vědomí, že právě tím je značka ověřitelná.
            E-mail se nezveřejňuje.
          </span>
        </label>
        {state.errors?.souhlas ? (
          <p className="mt-1.5 text-xs text-red-700 dark:text-red-400">
            {state.errors.souhlas}
          </p>
        ) : null}
      </div>

      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Ukládám…" : prvniVyplneni ? "Podat žádost" : "Uložit profil"}
      </button>
    </form>
  );
}
