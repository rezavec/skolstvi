"use client";

import { useActionState } from "react";
import { vyridNamitkuAkce } from "@/actions/admin";
import { idleState } from "@/lib/form-state";
import {
  ErrorBox,
  SuccessBox,
  buttonSecondaryClass,
  inputClass,
} from "@/components/ui";

/**
 * Komponenta zůstává namontovaná i po vyřízení námitky — jen místo
 * formuláře ukáže, jak se to vyřídilo.
 *
 * Kdyby se místo toho ve stránce podmíněně nerenderovala, React by ji po
 * vyřízení odmontoval a zmizel by i výsledek akce. To by vadilo hlavně
 * tehdy, kdyby se nepovedlo odeslat odpověď namítajícímu — správce by se
 * o tom nedozvěděl.
 */
export function VyrizeniForm({
  namitkaId,
  stav,
  vyrizeni,
}: {
  namitkaId: number;
  stav: string;
  vyrizeni: string | null;
}) {
  const [state, action, pending] = useActionState(vyridNamitkuAkce, idleState);

  if (stav !== "nova") {
    return (
      <div className="mt-3 border-t border-line pt-3">
        {state.status === "success" && state.message ? (
          <SuccessBox>{state.message}</SuccessBox>
        ) : null}
        {state.status === "error" && state.message ? (
          <ErrorBox>{state.message}</ErrorBox>
        ) : null}
        {vyrizeni ? (
          <p className="text-sm">
            <span className="text-muted">Vyřízení: </span>
            {vyrizeni}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={action} className="mt-3 border-t border-line pt-3">
      {state.status === "error" && state.message ? (
        <ErrorBox>{state.message}</ErrorBox>
      ) : null}
      {state.status === "success" && state.message ? (
        <SuccessBox>{state.message}</SuccessBox>
      ) : null}

      <input type="hidden" name="namitkaId" value={namitkaId} />

      <label htmlFor={`vyrizeni-${namitkaId}`} className="mb-1.5 block text-sm font-medium">
        Jak se to vyřídilo
      </label>
      <p className="mb-1.5 text-xs text-muted">
        Posílá se namítajícímu e-mailem. U zamítnutí tím odpovídáš na jeho
        námitku, takže napiš proč.
      </p>
      <textarea
        id={`vyrizeni-${namitkaId}`}
        name="vyrizeni"
        rows={3}
        required
        defaultValue={state.values?.vyrizeni}
        className={`${inputClass} mb-2 text-sm`}
      />
      {state.errors?.vyrizeni ? (
        <p className="mb-2 text-xs text-red-700 dark:text-red-400">
          {state.errors.vyrizeni}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          name="rozhodnuti"
          value="vyhovet"
          disabled={pending}
          className={buttonSecondaryClass}
        >
          Vyhovět — značku odebrat
        </button>
        <button
          type="submit"
          name="rozhodnuti"
          value="zamitnout"
          disabled={pending}
          className={buttonSecondaryClass}
        >
          Zamítnout — značka zůstává
        </button>
      </div>
    </form>
  );
}
