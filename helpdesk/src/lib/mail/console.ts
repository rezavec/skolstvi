import "server-only";
import { mkdir, appendFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Mail } from "./index";

const MAILBOX_DIR = path.join(process.cwd(), ".dev-mail");

/**
 * Vývojový driver: nic neodesílá.
 *
 * Mail vypíše do terminálu a uloží do .dev-mail/ — `last.json` je vždy
 * poslední odeslaný mail, `log.jsonl` je historie. Z `last.json` čte
 * smoke test (scripts/smoke.mjs) přihlašovací odkaz, takže se dá celý
 * magic link flow projít automatizovaně bez poštovní schránky.
 *
 * Zápis na disk je best-effort: na Vercelu je souborový systém read-only,
 * takže by jinak tenhle driver shodil aplikaci, kdyby na něm někdo omylem
 * nechal produkci.
 */
export async function sendViaConsole(mail: Mail): Promise<void> {
  const link = extractFirstLink(mail.text);

  console.log("\n┌─────────────────────────────────────────────────────────");
  console.log("│ MAIL_DRIVER=console — e-mail se NEODESLAL");
  console.log(`│ Komu:    ${mail.to}`);
  console.log(`│ Předmět: ${mail.subject}`);
  if (link) {
    console.log("│");
    console.log(`│ Odkaz:   ${link}`);
  }
  console.log("└─────────────────────────────────────────────────────────\n");
  console.log(mail.text);
  console.log("");

  const record = { ...mail, link, sentAt: new Date().toISOString() };

  try {
    await mkdir(MAILBOX_DIR, { recursive: true });
    await writeFile(
      path.join(MAILBOX_DIR, "last.json"),
      JSON.stringify(record, null, 2),
      "utf8",
    );
    await appendFile(
      path.join(MAILBOX_DIR, "log.jsonl"),
      JSON.stringify(record) + "\n",
      "utf8",
    );
  } catch (error) {
    console.warn(
      "[mail] Nepodařilo se zapsat do .dev-mail/ (na read-only disku je to v pořádku):",
      error instanceof Error ? error.message : error,
    );
  }
}

function extractFirstLink(text: string): string | null {
  return text.match(/https?:\/\/\S+/)?.[0] ?? null;
}
