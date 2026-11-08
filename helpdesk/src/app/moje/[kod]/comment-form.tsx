"use client";

import { useActionState } from "react";
import { addRequesterComment } from "@/actions/tickets";
import { idleState } from "@/lib/form-state";
import { buttonClass, inputClass } from "@/components/ui";

export function CommentForm({ code }: { code: string }) {
  const [state, action, pending] = useActionState(
    addRequesterComment,
    idleState,
  );

  return (
    <form action={action} noValidate>
      <input type="hidden" name="code" value={code} />

      <textarea
        name="body"
        rows={3}
        required
        maxLength={5000}
        placeholder="Projektor zase nejde, od včerejška."
        className={inputClass}
        aria-label="Komentář k tiketu"
      />

      {state.status === "error" ? (
        <p role="alert" className="mt-1.5 text-xs text-red-700 dark:text-red-400">
          {state.errors?.body ?? state.message}
        </p>
      ) : null}

      {state.status === "success" ? (
        <p className="mt-1.5 text-xs text-green-700 dark:text-green-400">
          Odesláno, uvidím to ve své frontě.
        </p>
      ) : null}

      <div className="mt-3">
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Odesílám…" : "Odeslat"}
        </button>
      </div>
    </form>
  );
}
