"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import {
  addTicketEvent,
  changeTicketStatus,
  getTicketByCode,
} from "@/db/queries";
import { env } from "@/lib/env";
import { sendMail } from "@/lib/mail";
import { ticketClosedMail } from "@/lib/mail-templates";
import { clearAdminSession, isAdmin } from "@/lib/session";
import {
  commentSchema,
  fieldErrors,
  statusChangeSchema,
} from "@/lib/validation";
import { errorState, formValues, type FormState } from "@/lib/form-state";
import { statusLabel, type TicketStatus } from "@/lib/statuses";

/**
 * Každá akce si sama ověří, že ji volá admin.
 *
 * Guard v app/admin/layout.tsx chrání jen zobrazení stránek — Server Action
 * se dá zavolat přímo POSTem na její endpoint, mimo jakýkoli layout. Layout
 * proto NENÍ bezpečnostní hranice a kontrola musí být tady.
 */
async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) {
    throw new Error("Nepřihlášený přístup k administraci.");
  }
}

/** Změní stav tiketu, zapíše to do historie a případně dá vědět žadateli. */
export async function changeStatus(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const values = formValues(formData);
  const code = String(formData.get("code") ?? "");

  const parsed = statusChangeSchema.safeParse({
    status: values.status ?? "",
    resolution: values.resolution ?? "",
    timeSpentMinutes: values.timeSpentMinutes ?? "",
  });

  if (!parsed.success) {
    return errorState("Zkontroluj prosím vyplněná pole.", {
      errors: fieldErrors(parsed.error),
      values,
    });
  }

  const ticket = await getTicketByCode(code);
  if (!ticket) {
    return errorState("Tiket nenalezen.");
  }

  const status = parsed.data.status as TicketStatus;

  await changeTicketStatus({
    ticketId: ticket.id,
    status,
    note: `Stav změněn na „${statusLabel(status)}“.`,
    resolution: parsed.data.resolution,
    timeSpentMinutes: parsed.data.timeSpentMinutes,
  });

  // Žadateli se píše jen při uzavření — jinak by ho to zasypalo maily.
  if (status === "done" || status === "rejected") {
    await sendMail(
      ticketClosedMail({
        to: ticket.requesterEmail,
        ticket: {
          ...ticket,
          status,
          resolution: parsed.data.resolution ?? ticket.resolution,
        },
        ticketUrl: `${env.appUrl}/moje/${ticket.code}`,
      }),
    );
  }

  refresh();
  return { status: "success" };
}

/** Komentář, který žadatel uvidí. */
export async function addAdminComment(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  return addEvent(formData, "comment");
}

/** Interní poznámka — do pohledu žadatele se nikdy nedostane. */
export async function addInternalNote(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  return addEvent(formData, "internal_note");
}

async function addEvent(
  formData: FormData,
  type: "comment" | "internal_note",
): Promise<FormState> {
  const code = String(formData.get("code") ?? "");
  const parsed = commentSchema.safeParse({
    body: String(formData.get("body") ?? ""),
  });

  if (!parsed.success) {
    return errorState("Text je prázdný nebo moc dlouhý.", {
      errors: fieldErrors(parsed.error),
    });
  }

  const ticket = await getTicketByCode(code);
  if (!ticket) {
    return errorState("Tiket nenalezen.");
  }

  await addTicketEvent({
    ticketId: ticket.id,
    type,
    body: parsed.data.body,
    author: "admin",
  });

  refresh();
  return { status: "success" };
}

export async function adminLogout(): Promise<void> {
  await clearAdminSession();
  redirect("/admin/prihlaseni");
}
