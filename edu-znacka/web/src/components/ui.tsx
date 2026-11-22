import type { ReactNode } from "react";
import Link from "next/link";

/** Sdílené kousky UI, aby se tytéž třídy nepsaly na dvaceti místech. */

export function Page({
  children,
  width = "normal",
}: {
  children: ReactNode;
  width?: "normal" | "wide" | "narrow";
}) {
  const max =
    width === "wide" ? "max-w-6xl" : width === "narrow" ? "max-w-xl" : "max-w-3xl";
  return (
    <main className={`mx-auto ${max} px-4 py-10 sm:py-14`}>{children}</main>
  );
}

export function Card({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  /** Pro odkazy v rámci stránky (`#instalace`). */
  id?: string;
}) {
  return (
    <div
      id={id}
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
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {children}
      </h1>
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
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * Značka „ověřeno“ — ta silná. Znamená, že konkrétní video přečetl
 * odborník z oboru a podepsal to.
 */
export function ZnackaOvereno({ obor }: { obor?: string }) {
  return (
    <Badge className="bg-overeno-bg text-overeno ring-overeno-line">
      <IkonaFajfka />
      {obor ? `ověřeno · ${obor}` : "ověřeno"}
    </Badge>
  );
}

/**
 * Značka „důvěryhodný kanál“ — ta slabší. Musí vypadat jinak, jinak by
 * se význam té silné rozmělnil.
 */
export function ZnackaKanal() {
  return (
    <Badge className="bg-kanal-bg text-kanal ring-kanal-line">
      <IkonaKanal />
      důvěryhodný kanál
    </Badge>
  );
}

/** Fajfka ve kroužku. Jiný tvar než u kanálu — kvůli barvosleposti. */
export function IkonaFajfka({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className} fill="currentColor">
      <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.86 5.47L7.4 11.1a.75.75 0 01-1.1.07L3.9 8.9a.75.75 0 111.02-1.1l1.8 1.68 3.95-5a.75.75 0 011.18.93z" />
    </svg>
  );
}

function IkonaKanal() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5" fill="currentColor">
      <path d="M2 4.5A2.5 2.5 0 014.5 2h7A2.5 2.5 0 0114 4.5v7a2.5 2.5 0 01-2.5 2.5h-7A2.5 2.5 0 012 11.5v-7zm4.75 1.7v3.6c0 .3.33.49.59.34l3.1-1.8a.4.4 0 000-.68l-3.1-1.8a.4.4 0 00-.59.34z" />
    </svg>
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

export function SuccessBox({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      data-testid="form-success"
      className="mb-5 rounded-lg border border-overeno-line bg-overeno-bg px-4 py-3 text-sm text-overeno"
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
  hint?: ReactNode;
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

/** Hlavička s navigací. Na veřejných stránkách. */
export function Hlavicka({ odkazy }: { odkazy?: { href: string; text: string }[] }) {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <IkonaFajfka className="h-5 w-5 text-overeno" />
          Edu značka
        </Link>
        <nav className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
          {(
            odkazy ?? [
              { href: "/katalog", text: "Katalog" },
              { href: "/recenzenti", text: "Recenzenti" },
              { href: "/pro-odborniky", text: "Pro odborníky" },
            ]
          ).map((o) => (
            <Link key={o.href} href={o.href} className="hover:text-foreground">
              {o.text}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function Paticka() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap gap-x-6 gap-y-2 px-4 py-6 text-sm text-muted">
        <Link href="/soukromi" className="hover:text-foreground">
          Ochrana údajů
        </Link>
        <Link href="/jak-to-funguje" className="hover:text-foreground">
          Jak se značka uděluje
        </Link>
        <Link href="/pro-odborniky" className="hover:text-foreground">
          Chci recenzovat
        </Link>
        <span className="ml-auto">Volně k použití pro jakoukoli školu.</span>
      </div>
    </footer>
  );
}

/** Datum v českém formátu, ve stejné podobě všude. */
export function formatDate(value: Date | string | null): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).format(date);
}

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

/** „před 3 dny“ — jak je značka stará. */
export function formatStari(from: Date | string | null): string {
  if (!from) return "—";
  const start = typeof from === "string" ? new Date(from) : from;
  const dni = Math.floor((Date.now() - start.getTime()) / 86_400_000);

  if (dni <= 0) return "dnes";
  if (dni === 1) return "včera";
  if (dni < 5) return `před ${dni} dny`;
  if (dni < 32) return `před ${dni} dny`;

  const mesice = Math.floor(dni / 30);
  if (mesice < 12) return mesice === 1 ? "před měsícem" : `před ${mesice} měsíci`;

  const roky = Math.floor(dni / 365);
  return roky === 1 ? "před rokem" : `před ${roky} roky`;
}

/** Celé jméno s titulem, jak se má zobrazovat na veřejnosti. */
export function jmenoSTitulem(r: { jmeno: string; titul: string | null }): string {
  return r.titul ? `${r.titul} ${r.jmeno}` : r.jmeno;
}
