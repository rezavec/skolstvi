"use client";

import { useActionState } from "react";
import { rozhodniORecenzentoviAkce } from "@/actions/admin";
import { idleState } from "@/lib/form-state";
import {
  ErrorBox,
  SuccessBox,
  buttonSecondaryClass,
  inputClass,
} from "@/components/ui";

/**
 * Rozhodnutí o jednom recenzentovi.
 *
 * Důvod je povinný u zamítnutí a pozastavení — recenzent se ho dozví
 * e-mailem a správce si za půl roku nevzpomene, proč to udělal.
 */
export function RozhodnutiForm({
  recenzentId,
  moznosti,
}: {
  recenzentId: number;
  moznosti: { hodnota: string; text: string }[];
}) {
  const [state, action, pending] = useActionState(
    rozhodniORecenzentoviAkce,
    idleState,
  );

  return (
    <form action={action} className="mt-3 border-t border-line pt-3">
      {state.status === "error" && state.message ? (
        <ErrorBox>{state.message}</ErrorBox>
      ) : null}
      {state.status === "success" && state.message ? (
        <SuccessBox>{state.message}</SuccessBox>
      ) : null}

      <input type="hidden" name="recenzentId" value={recenzentId} />

      <label htmlFor={`duvod-${recenzentId}`} className="sr-only">
        Důvod
      </label>
      <input
        id={`duvod-${recenzentId}`}
        name="duvod"
        placeholder="Důvod (povinný u zamítnutí a pozastavení) — pošle se e-mailem"
        className={`${inputClass} mb-2 text-sm`}
      />
      {state.errors?.duvod ? (
        <p className="mb-2 text-xs text-red-700 dark:text-red-400">
          {state.errors.duvod}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {moznosti.map((m) => (
          <button
            key={m.hodnota}
            type="submit"
            name="rozhodnuti"
            value={m.hodnota}
            disabled={pending}
            className={buttonSecondaryClass}
          >
            {m.text}
          </button>
        ))}
      </div>
    </form>
  );
}
