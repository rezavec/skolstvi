import type { ReactNode } from "react";

/** Sdílené kousky UI, aby se tytéž třídy nepsaly na dvaceti místech. */

export function Page({
  children,
  width = "normal",
}: {
  children: ReactNode;
  width?: "normal" | "wide";
}) {
  const max = width === "wide" ? "max-w-5xl" : "max-w-xl";
  return (
    <main className={`mx-auto ${max} px-4 py-10 sm:py-14`}>{children}</main>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-line bg-surface p-5 sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

export function Heading({
  children,
  sub,
}: {
  children: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight">{children}</h1>
      {sub ? <p className="mt-2 text-sm text-muted">{sub}</p> : null}
    </div>
  );
}

export function Badge({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      {children}
    </span>
  );
}

/** Hláška s chybou, kterou musí být vidět. */
export function ErrorBox({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      data-testid="form-error"
      className="mb-5 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/60 dark:text-red-200"
    >
      {children}
    </div>
  );
}

export function InfoBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-background px-4 py-3 text-sm text-muted">
      {children}
    </div>
  );
}

/** Popisek pole s nepovinnou nápovědou a chybou pod ním. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-5">
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      {hint ? <p className="mb-1.5 text-xs text-muted">{hint}</p> : null}
      {children}
      {error ? (
        <p
          data-testid="field-error"
          className="mt-1.5 text-xs text-red-700 dark:text-red-400"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-base " +
  "placeholder:text-muted/70 focus:border-accent focus:outline-none";

export const buttonClass =
  "inline-flex w-full items-center justify-center rounded-lg bg-accent px-4 py-2.5 " +
  "text-base font-semibold text-accent-foreground disabled:opacity-60 sm:w-auto";

export const buttonSecondaryClass =
  "inline-flex items-center justify-center rounded-lg border border-line bg-surface " +
  "px-4 py-2 text-sm font-medium hover:bg-background";

/** Datum a čas v českém formátu, ve stejné podobě všude. */
export function formatDateTime(value: Date | string | null): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDate(value: Date | string | null): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).format(date);
}

/** „3 h 20 min“ místo „200 min“ — čitelnější ve výkazu. */
export function formatMinutes(minutes: number | null): string {
  if (minutes === null || minutes === undefined) return "—";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/**
 * „čeká 3 dny“ — jak dlouho je tiket otevřený.
 *
 * Ve frontě je to užitečnější signál než absolutní datum: hned je vidět,
 * co tam leží moc dlouho.
 */
export function formatAge(from: Date | string): string {
  const start = typeof from === "string" ? new Date(from) : from;
  const days = Math.floor((Date.now() - start.getTime()) / 86_400_000);

  if (days === 0) return "dnes";
  if (days === 1) return "1 den";
  if (days < 5) return `${days} dny`;
  if (days < 32) return `${days} dní`;

  const months = Math.floor(days / 30);
  return months === 1 ? "měsíc" : `${months} měsíce`;
}
