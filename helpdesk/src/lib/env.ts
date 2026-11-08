import "server-only";

/**
 * Čtení proměnných prostředí.
 *
 * Záměrně se vyhodnocuje až při prvním použití, ne při importu modulu —
 * jinak by `next build` padal na chybějících proměnných, přitom je potřebuje
 * až běžící aplikace.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Chybí proměnná prostředí ${name}. Zkopíruj .env.example do .env.local a vyplň ji.`,
    );
  }
  return value.trim();
}

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : undefined;
}

export const env = {
  get databaseUrl() {
    return required("DATABASE_URL");
  },

  get appSecret() {
    const secret = required("APP_SECRET");
    if (secret.length < 32) {
      throw new Error(
        "APP_SECRET musí mít alespoň 32 znaků. Vygeneruj nový: openssl rand -base64 48",
      );
    }
    return secret;
  },

  get adminPassword() {
    return required("ADMIN_PASSWORD");
  },

  /** Povolené domény, vždy lowercase a bez prázdných položek. */
  get allowedEmailDomains(): string[] {
    const raw = optional("ALLOWED_EMAIL_DOMAINS");
    if (!raw) {
      throw new Error(
        "Chybí ALLOWED_EMAIL_DOMAINS. Bez ní by tikety mohl zadávat kdokoli z internetu.",
      );
    }
    const domains = raw
      .split(",")
      .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
      .filter(Boolean);

    if (domains.length === 0) {
      throw new Error("ALLOWED_EMAIL_DOMAINS nesmí být prázdná.");
    }
    return domains;
  },

  get mailDriver(): "console" | "resend" {
    const driver = (optional("MAIL_DRIVER") ?? "console").toLowerCase();
    if (driver !== "console" && driver !== "resend") {
      throw new Error(
        `MAIL_DRIVER má neznámou hodnotu "${driver}". Povolené je console nebo resend.`,
      );
    }
    return driver;
  },

  get resendApiKey() {
    return required("RESEND_API_KEY");
  },

  get mailFrom() {
    return required("MAIL_FROM");
  },

  /** Kam posílat upozornění na nový tiket. Nepovinné. */
  get adminNotifyEmail() {
    return optional("ADMIN_NOTIFY_EMAIL");
  },

  /** Adresa aplikace bez lomítka na konci. */
  get appUrl() {
    const url = optional("APP_URL") ?? "http://localhost:3000";
    return url.replace(/\/+$/, "");
  },
};
