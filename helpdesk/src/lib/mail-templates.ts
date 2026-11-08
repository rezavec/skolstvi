import "server-only";
import type { Mail } from "./mail";
import type { Ticket } from "@/db/schema";
import { categoryLabel, priorityLabel, statusLabel } from "./statuses";

/** Escapování pro HTML verzi mailů — hodnoty píšou uživatelé. */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="cs"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#18181b">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:28px">
    <h1 style="margin:0 0 16px;font-size:19px">${esc(title)}</h1>
    ${bodyHtml}
    <hr style="border:0;border-top:1px solid #e4e4e7;margin:28px 0 14px">
    <p style="margin:0;font-size:12px;color:#71717a">
      Školní IT helpdesk — tenhle e-mail poslal počítač, neodpovídej na něj.
    </p>
  </div>
</body></html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:24px 0">
    <a href="${esc(href)}" style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600">${esc(label)}</a>
  </p>`;
}

/** Přihlašovací odkaz pro žadatele. */
export function magicLinkMail(args: {
  to: string;
  link: string;
  validMinutes: number;
}): Mail {
  const text = `Přihlášení do školního IT helpdesku

Klikni na tento odkaz a můžeš nahlásit závadu:

${args.link}

Odkaz platí ${args.validMinutes} minut a dá se použít jenom jednou.

Pokud jsi o přihlášení nežádal, nic nedělej — bez kliknutí se nic nestane.`;

  return {
    to: args.to,
    subject: "Přihlášení do školního IT helpdesku",
    text,
    html: layout(
      "Přihlášení do helpdesku",
      `<p style="margin:0;font-size:15px;line-height:1.6">Klikni na tlačítko a můžeš nahlásit závadu.</p>
       ${button(args.link, "Přihlásit a nahlásit závadu")}
       <p style="margin:0;font-size:13px;color:#52525b;line-height:1.6">
         Odkaz platí <strong>${args.validMinutes} minut</strong> a dá se použít jenom jednou.<br>
         Pokud jsi o přihlášení nežádal, nic nedělej — bez kliknutí se nic nestane.
       </p>`,
    ),
  };
}

/** Upozornění pro správce IT, že přišel nový tiket. */
export function newTicketAdminMail(args: {
  to: string;
  ticket: Ticket;
  adminUrl: string;
}): Mail {
  const t = args.ticket;
  const text = `Nový tiket ${t.code}

${t.title}

Od:        ${t.requesterName ? `${t.requesterName} (${t.requesterEmail})` : t.requesterEmail}
Místo:     ${t.location}
Kategorie: ${categoryLabel(t.category)}
Priorita:  ${priorityLabel(t.priority)}

Popis:
${t.description}

Detail: ${args.adminUrl}`;

  return {
    to: args.to,
    subject: `[${t.code}] ${t.title}`,
    text,
    html: layout(
      `Nový tiket ${t.code}`,
      `<p style="margin:0 0 18px;font-size:16px;font-weight:600">${esc(t.title)}</p>
       <table style="border-collapse:collapse;font-size:14px;line-height:1.7">
         <tr><td style="padding-right:14px;color:#71717a">Od</td><td>${esc(t.requesterName ? `${t.requesterName} (${t.requesterEmail})` : t.requesterEmail)}</td></tr>
         <tr><td style="padding-right:14px;color:#71717a">Místo</td><td>${esc(t.location)}</td></tr>
         <tr><td style="padding-right:14px;color:#71717a">Kategorie</td><td>${esc(categoryLabel(t.category))}</td></tr>
         <tr><td style="padding-right:14px;color:#71717a">Priorita</td><td>${esc(priorityLabel(t.priority))}</td></tr>
       </table>
       <p style="margin:18px 0 0;font-size:14px;line-height:1.6;white-space:pre-wrap">${esc(t.description)}</p>
       ${button(args.adminUrl, "Otevřít tiket")}`,
    ),
  };
}

/** Oznámení žadateli, že je jeho tiket uzavřený. */
export function ticketClosedMail(args: {
  to: string;
  ticket: Ticket;
  ticketUrl: string;
}): Mail {
  const t = args.ticket;
  const resolved = t.status === "done";

  const text = `${resolved ? "Vyřešeno" : "Uzavřeno"}: ${t.code} — ${t.title}

Stav: ${statusLabel(t.status)}
${t.resolution ? `\nCo se s tím udělalo:\n${t.resolution}\n` : ""}
Detail tiketu: ${args.ticketUrl}

Pokud problém trvá, odpověz přímo v tiketu — otevře se znovu.`;

  return {
    to: args.to,
    subject: `${resolved ? "Vyřešeno" : "Uzavřeno"}: [${t.code}] ${t.title}`,
    text,
    html: layout(
      `${resolved ? "Vyřešeno" : "Uzavřeno"}: ${t.code}`,
      `<p style="margin:0 0 14px;font-size:16px;font-weight:600">${esc(t.title)}</p>
       <p style="margin:0 0 14px;font-size:14px">Stav: <strong>${esc(statusLabel(t.status))}</strong></p>
       ${
         t.resolution
           ? `<p style="margin:0 0 6px;font-size:13px;color:#71717a">Co se s tím udělalo</p>
              <p style="margin:0;font-size:14px;line-height:1.6;white-space:pre-wrap">${esc(t.resolution)}</p>`
           : ""
       }
       ${button(args.ticketUrl, "Otevřít tiket")}
       <p style="margin:0;font-size:13px;color:#52525b">Pokud problém trvá, odpověz přímo v tiketu — otevře se znovu.</p>`,
    ),
  };
}
