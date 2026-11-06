"use client";

import { useActionState } from "react";
import { requestMagicLink } from "@/actions/login";
import { idleState } from "@/lib/form-state";
import {
  Card,
  ErrorBox,
  Field,
  Heading,
  InfoBox,
  buttonClass,
  inputClass,
} from "@/components/ui";

export function LoginForm() {
  const [state, action, pending] = useActionState(requestMagicLink, idleState);

  // Po úspěšném odeslání se formulář vymění za potvrzení. Záměrně bez
  // přesměrování — adresa by se tím dostala do URL a do historie prohlížeče.
  if (state.status === "success") {
    return (
      <>
        <Heading sub="Zkontroluj prosím poštu.">Odkaz je na cestě</Heading>
        <Card>
          <span data-testid="link-sent" hidden />
          <p className="text-sm leading-relaxed">
            Poslal jsem přihlašovací odkaz na{" "}
            <strong className="font-semibold">{state.message}</strong>. Klikni
            na něj a můžeš nahlásit závadu.
          </p>
          <div className="mt-4">
            <InfoBox>
              Odkaz platí 30 minut a dá se použít jenom jednou. Pokud e-mail
              nepřišel do pár minut, mrkni do spamu.
            </InfoBox>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <Heading sub="Nahlas závadu na školní technice. Nejdřív se přihlas školním e-mailem — žádné zakládání účtu, žádné heslo.">
        Školní IT helpdesk
      </Heading>

      {state.status === "error" && state.message ? (
        <ErrorBox>{state.message}</ErrorBox>
      ) : null}

      <Card>
        <form action={action} noValidate>
          <Field
            label="Školní e-mail"
            htmlFor="email"
            hint="Pošlu ti na něj přihlašovací odkaz."
            error={state.errors?.email}
          >
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              autoFocus
              required
              defaultValue={state.values?.email ?? ""}
              placeholder="jmeno@zsulesa.cz"
              className={inputClass}
            />
          </Field>

          <button type="submit" disabled={pending} className={buttonClass}>
            {pending ? "Odesílám…" : "Poslat přihlašovací odkaz"}
          </button>
        </form>
      </Card>

      <p className="mt-6 text-xs text-muted">
        Spravuje školní IT. Přihlášení odkazem slouží k tomu, abych věděl, kdo
        závadu nahlásil, a mohl se případně doptat.
      </p>
    </>
  );
}
