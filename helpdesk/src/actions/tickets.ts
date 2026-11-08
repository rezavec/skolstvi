"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import {
  addTicketEvent,
  createTicket as insertTicket,
  getTicketByCode,
  reopenTicket,
} from "@/db/queries";
import { env } from "@/lib/env";
import { sendMail } from "@/lib/mail";
import { newTicketAdminMail } from "@/lib/mail-templates";
import { getRequesterEmail } from "@/lib/session";
import { commentSchema, createTicketSchema, fieldErrors } from "@/lib/validation";
import { errorState, formValues, type FormState } from "@/lib/form-state";
import { CLOSED_STATUSES, type TicketStatus } from "@/lib/statuses";

/**
 * Založí tiket.
 *
 * Server Action se dá zavolat i přímo POSTem mimo UI, takže se session
 * kontroluje tady, ne jen v komponentě stránky.
 */
export async function createTicket(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const requesterEmail = await getRequesterEmail();
  if (!requesterEmail) {
    return errorState(
      "Přihlášení vypršelo. Nech si prosím poslat nový odkaz — co jsi napsal, se tím ale ztratí.",
    );
  }

  const values = formValues(formData);
  const parsed = createTicketSchema.safeParse(values);

  if (!parsed.success) {
    return errorState("Zkontroluj prosím vyplněná pole.", {
      errors: fieldErrors(parsed.error),
      values,
    });
  }

  const ticket = await insertTicket({
    requesterEmail,
    requesterName: parsed.data.requesterName,
    location: parsed.data.location,
    category: parsed.data.category,
    priority: parsed.data.priority,
    title: parsed.data.title,
    description: parsed.data.description,
  });

  // Upozornění pro správce IT. Když se nepodaří odeslat, tiket už existuje
  // a je ve frontě — jen o něm nepřijde mail, takže se akce nekazí.
  const notifyTo = env.adminNotifyEmail;
  if (notifyTo) {
    await sendMail(
      newTicketAdminMail({
        to: notifyTo,
        ticket,
        adminUrl: `${env.appUrl}/admin/tiket/${ticket.code}`,
      }),
    );
  }

  redirect(`/moje/${ticket.code}`);
}

/**
 * Komentář žadatele k vlastnímu tiketu.
 *
 * Pokud byl tiket uzavřený, odpovědí se znovu otevře — to je slíbené
 * v e-mailu o vyřešení.
 */
export async function addRequesterComment(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const requesterEmail = await getRequesterEmail();
  if (!requesterEmail) {
    return errorState("Přihlášení vypršelo. Nech si prosím poslat nový odkaz.");
  }

  const code = String(formData.get("code") ?? "");
  const parsed = commentSchema.safeParse({
    body: String(formData.get("body") ?? ""),
  });

  if (!parsed.success) {
    return errorState("Zkontroluj prosím text komentáře.", {
      errors: fieldErrors(parsed.error),
    });
  }

  const ticket = await getTicketByCode(code);

  // Tiket musí existovat A patřit přihlášenému — jinak by šlo komentovat
  // cizí tikety uhádnutím kódu.
  if (!ticket || ticket.requesterEmail !== requesterEmail) {
    return errorState("Tenhle tiket neexistuje, nebo není tvůj.");
  }

  const wasClosed = CLOSED_STATUSES.includes(ticket.status as TicketStatus);

  if (wasClosed) {
    await addTicketEvent({
      ticketId: ticket.id,
      type: "comment",
      body: parsed.data.body,
      author: requesterEmail,
    });
    await reopenTicket({
      ticketId: ticket.id,
      note: "Žadatel odpověděl na uzavřený tiket — otevřeno znovu.",
      author: requesterEmail,
    });
  } else {
    await addTicketEvent({
      ticketId: ticket.id,
      type: "comment",
      body: parsed.data.body,
      author: requesterEmail,
    });
  }

  refresh();
  return { status: "success" };
}
