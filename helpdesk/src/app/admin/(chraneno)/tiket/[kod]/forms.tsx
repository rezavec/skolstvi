"use client";

import { useActionState, useState } from "react";
import {
  addAdminComment,
  addInternalNote,
  changeStatus,
} from "@/actions/admin";
import { idleState } from "@/lib/form-state";
import {
  TICKET_STATUSES,
  type TicketStatus,
} from "@/lib/statuses";
import {
  Card,
  ErrorBox,
  Field,
  buttonClass,
  inputClass,
} from "@/components/ui";

const statuses = Object.entries(TICKET_STATUSES) as [
  TicketStatus,
  { label: string; short: string; order: number },
][];

/**
 * Změna stavu a zápis práce.
 *
 * Pole „co jsem udělal“ a „strávený čas“ se ukážou až při uzavírání — jinak
 * by zabírala místo pokaždé. Při uzavření je vyplnění vynucené (i na serveru,
 * viz statusChangeSchema), protože kvůli tomu seznamu je celý systém vedený.
 */
export function StatusForm({
  code,
  currentStatus,
  currentResolution,
  currentTimeSpent,
}: {
  code: string;
  currentStatus: TicketStatus;
  currentResolution: string | null;
  currentTimeSpent: number | null;
}) {
  const [state, action, pending] = useActionState(changeStatus, idleState);
  const [selected, setSelected] = useState<TicketStatus>(currentStatus);

  const closing = selected === "done" || selected === "rejected";

  return (
    <Card className="lg:sticky lg:top-5">
      <h2 className="mb-4 text-sm font-semibold">Změnit stav</h2>

      {state.status === "error" && state.message ? (
        <ErrorBox>{state.message}</ErrorBox>
      ) : null}

      {state.status === "success" ? (
        <p
          data-testid="status-saved"
          className="mb-4 text-xs text-green-700 dark:text-green-400"
        >
          Uloženo.
        </p>
      ) : null}

      <form action={action} noValidate>
        <input type="hidden" name="code" value={code} />

        <Field label="Stav" htmlFor="status" error={state.errors?.status}>
          <select
            id="status"
            name="status"
            value={selected}
            onChange={(e) => setSelected(e.target.value as TicketStatus)}
            className={inputClass}
          >
            {statuses.map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>

        {closing ? (
          <>
            <Field
              label="Co jsem udělal"
              htmlFor="resolution"
              hint="Tohle uvidí žadatel v e-mailu a objeví se to v archivu i v exportu."
              error={state.errors?.resolution}
            >
              <textarea
                id="resolution"
                name="resolution"
                rows={4}
                required
                maxLength={5000}
                defaultValue={
                  state.values?.resolution ?? currentResolution ?? ""
                }
                placeholder="Vyměněna HDMI kabel, projektor přeladěn na vstup 2."
                className={inputClass}
              />
            </Field>

            <Field
              label="Strávený čas (minuty)"
              htmlFor="timeSpentMinutes"
              hint="Nepovinné. Sečte se v exportu jako podklad pro výkaz."
              error={state.errors?.timeSpentMinutes}
            >
              <input
                id="timeSpentMinutes"
                name="timeSpentMinutes"
                type="number"
                min={0}
                max={9999}
                step={5}
                inputMode="numeric"
                defaultValue={
                  state.values?.timeSpentMinutes ??
                  (currentTimeSpent !== null ? String(currentTimeSpent) : "")
                }
                placeholder="20"
                className={inputClass}
              />
            </Field>
          </>
        ) : (
          // Hodnoty se posílají i při nezavírání, ať se nepřepíšou na null
          <>
            <input
              type="hidden"
              name="resolution"
              value={currentResolution ?? ""}
            />
            <input
              type="hidden"
              name="timeSpentMinutes"
              value={currentTimeSpent !== null ? String(currentTimeSpent) : ""}
            />
          </>
        )}

        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Ukládám…" : closing ? "Uzavřít tiket" : "Uložit stav"}
        </button>

        {closing ? (
          <p className="mt-3 text-xs text-muted">
            Žadateli přijde e-mail, že je to vyřešené.
          </p>
        ) : null}
      </form>
    </Card>
  );
}

/** Dvě oddělené pole: co uvidí žadatel, a co je jen pro mě. */
export function AdminNoteForms({ code }: { code: string }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <NoteForm
        code={code}
        kind="comment"
        title="Napsat žadateli"
        hint="Uvidí to v detailu svého tiketu."
        placeholder="Díly jsou objednané, mělo by přijít do pátku."
      />
      <NoteForm
        code={code}
        kind="internal"
        title="Interní poznámka"
        hint="Jen pro mě. Žadatel to nikdy neuvidí."
        placeholder="Zdroj je po záruce, při další závadě vyhodit."
      />
    </div>
  );
}

function NoteForm({
  code,
  kind,
  title,
  hint,
  placeholder,
}: {
  code: string;
  kind: "comment" | "internal";
  title: string;
  hint: string;
  placeholder: string;
}) {
  const [state, action, pending] = useActionState(
    kind === "comment" ? addAdminComment : addInternalNote,
    idleState,
  );

  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold">{title}</h2>
      <p className="mb-3 text-xs text-muted">{hint}</p>

      <form action={action} noValidate>
        <input type="hidden" name="code" value={code} />
        <textarea
          name="body"
          rows={3}
          required
          maxLength={5000}
          placeholder={placeholder}
          className={inputClass}
          aria-label={title}
        />

        {state.status === "error" ? (
          <p role="alert" className="mt-1.5 text-xs text-red-700 dark:text-red-400">
            {state.errors?.body ?? state.message}
          </p>
        ) : null}

        {state.status === "success" ? (
          <p
            data-testid="note-saved"
            className="mt-1.5 text-xs text-green-700 dark:text-green-400"
          >
            Zapsáno.
          </p>
        ) : null}

        <div className="mt-3">
          <button type="submit" disabled={pending} className={buttonClass}>
            {pending ? "Ukládám…" : "Zapsat"}
          </button>
        </div>
      </form>
    </Card>
  );
}
