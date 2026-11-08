"use client";

import { useActionState } from "react";
import { createTicket } from "@/actions/tickets";
import { idleState } from "@/lib/form-state";
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  type TicketCategory,
  type TicketPriority,
} from "@/lib/statuses";
import {
  Card,
  ErrorBox,
  Field,
  buttonClass,
  inputClass,
} from "@/components/ui";

const categories = Object.entries(TICKET_CATEGORIES) as [
  TicketCategory,
  string,
][];

const priorities = Object.entries(TICKET_PRIORITIES) as [
  TicketPriority,
  { label: string; weight: number },
][];

export function TicketForm() {
  const [state, action, pending] = useActionState(createTicket, idleState);
  const v = state.values ?? {};

  return (
    <>
      {state.status === "error" && state.message ? (
        <ErrorBox>{state.message}</ErrorBox>
      ) : null}

      <Card>
        <form action={action} noValidate>
          <Field
            label="Co se děje?"
            htmlFor="title"
            hint="Jedna věta, ať to poznám v seznamu."
            error={state.errors?.title}
          >
            <input
              id="title"
              name="title"
              type="text"
              required
              autoFocus
              maxLength={150}
              defaultValue={v.title ?? ""}
              placeholder="Projektor v 2.B nenaskočí"
              className={inputClass}
            />
          </Field>

          <Field
            label="Kde to je?"
            htmlFor="location"
            hint="Číslo třídy, kabinet, sborovna, chodba…"
            error={state.errors?.location}
          >
            <input
              id="location"
              name="location"
              type="text"
              required
              maxLength={100}
              defaultValue={v.location ?? ""}
              placeholder="2.B"
              className={inputClass}
            />
          </Field>

          <Field
            label="Čeho se to týká?"
            htmlFor="category"
            error={state.errors?.category}
          >
            <select
              id="category"
              name="category"
              required
              defaultValue={v.category ?? "pc"}
              className={inputClass}
            >
              {categories.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Jak to spěchá?"
            htmlFor="priority"
            error={state.errors?.priority}
          >
            <select
              id="priority"
              name="priority"
              required
              defaultValue={v.priority ?? "normal"}
              className={inputClass}
            >
              {priorities.map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Popiš to podrobněji"
            htmlFor="description"
            hint="Co přesně nefunguje, od kdy, co už jsi zkoušel, jaká se případně hlásí chyba. Čím víc, tím rychleji to spravím."
            error={state.errors?.description}
          >
            <textarea
              id="description"
              name="description"
              required
              rows={6}
              maxLength={5000}
              defaultValue={v.description ?? ""}
              placeholder="Když zapnu projektor, bliká oranžová kontrolka a na tabuli nic není. Kabel jsem překontrolovala. Začalo to v pátek."
              className={inputClass}
            />
          </Field>

          <Field
            label="Jak se ti mám ozvat?"
            htmlFor="requesterName"
            hint="Nepovinné. Jméno nebo přezdívka, ať nemusím luštit e-mail."
            error={state.errors?.requesterName}
          >
            <input
              id="requesterName"
              name="requesterName"
              type="text"
              maxLength={100}
              defaultValue={v.requesterName ?? ""}
              placeholder="Jana Nováková"
              className={inputClass}
            />
          </Field>

          <button type="submit" disabled={pending} className={buttonClass}>
            {pending ? "Odesílám…" : "Odeslat závadu"}
          </button>
        </form>
      </Card>
    </>
  );
}
