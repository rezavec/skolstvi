"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  najdiKanalPodlePrezdivky,
  najdiVideo,
  nastavOdebraniZnacky,
  pridejKanal,
  pridejVideo,
  rozhodniORecenzentovi,
  najdiRecenzentaPodleId,
  vyridNamitku,
  zmenOborVidea,
  zmenStavKanalu,
} from "@/db/queries";
import { pozadujAdmina } from "@/lib/auth";
import { errorState, formValues, type FormState } from "@/lib/form-state";
import { sendMail } from "@/lib/mail";
import {
  mailNamitkaVyrizena,
  mailRecenzentovaRozhodnuti,
} from "@/lib/mail-templates";
import {
  adminLoginSchema,
  fieldErrors,
  kanalSchema,
  rozhodnutiRecenzentaSchema,
  videoSchema,
  vyrizeniNamitkySchema,
} from "@/lib/validation";
import { setAdminSession, clearAdminSession, verifyAdminPassword } from "@/lib/session";
import { nactiOembed, normalizujPrezdivku } from "@/lib/youtube";
import { jeObor, jeUroven } from "@/lib/obory";

/**
 * Akce administrace.
 *
 * Každá si **sama** ověří, že je přihlášený správce. Guard v layoutu chrání
 * jen zobrazení stránek — Server Action se dá zavolat POSTem úplně mimo UI.
 */

export async function prihlasSpravce(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = adminLoginSchema.safeParse({
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return errorState("Zadej heslo.", { errors: fieldErrors(parsed.error) });
  }

  if (!verifyAdminPassword(parsed.data.password)) {
    // Záměrně bez detailu — neříkáme, jestli bylo heslo blízko.
    return errorState("Špatné heslo.");
  }

  await setAdminSession();
  redirect("/admin");
}

export async function odhlasSpravce(): Promise<void> {
  await clearAdminSession();
  redirect("/");
}

// ── Videa ───────────────────────────────────────────────────────────────────

/**
 * Přidá video do fronty k recenzi.
 *
 * Název se tahá z oEmbed, aby ho správce nemusel přepisovat — a zároveň
 * se tím ověří, že video vůbec existuje a je veřejné. Když oEmbed neodpoví
 * (síť, rate limit), video se přidá s náhradním názvem a doplní se později;
 * selhání pošty ani YouTube nemá zabránit práci.
 */
export async function pridejVideoAkce(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await pozadujAdmina();

  const parsed = videoSchema.safeParse({
    odkaz: formData.get("odkaz"),
    obor: formData.get("obor"),
    uroven: formData.get("uroven"),
  });
  if (!parsed.success) {
    return errorState("Zkontroluj prosím formulář.", {
      errors: fieldErrors(parsed.error),
      values: formValues(formData),
    });
  }

  const { odkaz: youtubeId, obor, uroven } = parsed.data;

  const oembed = await nactiOembed(youtubeId);
  if (!oembed.ok && oembed.chybi) {
    return errorState(
      "Tohle video na YouTube neexistuje, nebo není veřejné. Zkontroluj odkaz.",
      { values: formValues(formData) },
    );
  }

  const nazev = oembed.ok ? oembed.nazev : `Video ${youtubeId}`;
  const kanalNazev = oembed.ok ? oembed.autor : null;

  // Když kanál v tabulce `kanaly` už máme, navážeme video na něj.
  const prezdivka = oembed.ok ? prezdivkaZUrl(oembed.autorUrl) : null;
  const kanal = prezdivka
    ? ((await najdiKanalPodlePrezdivky(prezdivka)) ?? null)
    : null;

  await pridejVideo({
    youtubeId,
    nazev,
    obor,
    uroven,
    kanalId: kanal?.id ?? null,
    kanalNazev,
    pridal: "admin",
  });

  revalidatePath("/admin/videa");
  revalidatePath("/katalog");

  return {
    status: "success",
    message: oembed.ok
      ? `Přidáno: „${nazev}“. Teď to čeká na posudek odborníka z oboru.`
      : `Přidáno, ale název se nepodařilo zjistit (${
          oembed.chybi ? "video chybí" : oembed.chyba
        }). Doplň ho později.`,
  };
}

export async function zmenZarazeniVideaAkce(formData: FormData): Promise<void> {
  await pozadujAdmina();

  const youtubeId = String(formData.get("youtubeId") ?? "");
  const obor = String(formData.get("obor") ?? "");
  const uroven = String(formData.get("uroven") ?? "");

  if (!jeObor(obor) || !jeUroven(uroven)) return;

  const video = await najdiVideo(youtubeId);
  if (!video) return;

  await zmenOborVidea(video.id, obor, uroven);
  revalidatePath("/admin/videa");
  revalidatePath(`/video/${youtubeId}`);
}

/** Ruční odebrání nebo vrácení značky. */
export async function prepniZnackuAkce(formData: FormData): Promise<void> {
  await pozadujAdmina();

  const youtubeId = String(formData.get("youtubeId") ?? "");
  const odebrat = formData.get("odebrat") === "ano";

  const video = await najdiVideo(youtubeId);
  if (!video) return;

  await nastavOdebraniZnacky(video.id, odebrat);
  revalidatePath("/admin/videa");
  revalidatePath(`/video/${youtubeId}`);
  revalidatePath("/katalog");
}

// ── Kanály ──────────────────────────────────────────────────────────────────

/**
 * Přidá nebo upraví důvěryhodný kanál.
 *
 * Značka kanálu je slabší tvrzení než značka videa a uděluje ji správce,
 * ne recenzent — proto se tu žádná recenze nevyžaduje. Bez téhle kategorie
 * by byl index první měsíce skoro prázdný.
 */
export async function pridejKanalAkce(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await pozadujAdmina();

  const parsed = kanalSchema.safeParse({
    odkaz: formData.get("odkaz"),
    nazev: formData.get("nazev"),
    obor: formData.get("obor"),
    poznamka: formData.get("poznamka"),
  });
  if (!parsed.success) {
    return errorState("Zkontroluj prosím formulář.", {
      errors: fieldErrors(parsed.error),
      values: formValues(formData),
    });
  }

  const { odkaz, nazev, obor, poznamka } = parsed.data;

  if (!odkaz.youtubeId) {
    return errorState(
      "Z téhle adresy se nedá vyčíst ID kanálu (`UC…`), jen přezdívka. " +
        "Otevři kanál, dej Zobrazit zdroj stránky a najdi si v něm `channelId` — " +
        "bez ID se kanál nedá spolehlivě poznat, protože přezdívku lze změnit.",
      { errors: { odkaz: "Chybí ID kanálu." }, values: formValues(formData) },
    );
  }

  await pridejKanal({
    youtubeId: odkaz.youtubeId,
    prezdivka: odkaz.prezdivka ? normalizujPrezdivku(odkaz.prezdivka) : null,
    nazev,
    obor,
    poznamka,
    stav: "overeno",
  });

  revalidatePath("/admin/kanaly");
  return { status: "success", message: `Kanál „${nazev}“ je označený jako důvěryhodný.` };
}

export async function zmenStavKanaluAkce(formData: FormData): Promise<void> {
  await pozadujAdmina();

  const id = Number(formData.get("id"));
  const stav = String(formData.get("stav") ?? "");

  if (!Number.isSafeInteger(id) || id <= 0) return;
  if (stav !== "ceka" && stav !== "overeno" && stav !== "pozastaveno") return;

  await zmenStavKanalu(id, stav);
  revalidatePath("/admin/kanaly");
}

// ── Recenzenti ──────────────────────────────────────────────────────────────

/**
 * Rozhodnutí o žádosti recenzenta.
 *
 * Tohle je to místo, kde se ověřuje, že odborník je odborník. Akademický
 * e-mail dokazuje jen to, že někdo ovládá adresu na instituci — že je to
 * skutečně ten člověk a že se oborem opravdu zabývá, musí dohledat správce
 * na stránkách instituce.
 */
export async function rozhodniORecenzentoviAkce(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await pozadujAdmina();

  const parsed = rozhodnutiRecenzentaSchema.safeParse({
    recenzentId: formData.get("recenzentId"),
    rozhodnuti: formData.get("rozhodnuti"),
    duvod: formData.get("duvod"),
  });
  if (!parsed.success) {
    return errorState("Nepovedlo se — zkontroluj formulář.", {
      errors: fieldErrors(parsed.error),
    });
  }

  const { recenzentId, rozhodnuti, duvod } = parsed.data;

  const recenzent = await najdiRecenzentaPodleId(recenzentId);
  if (!recenzent) return errorState("Takový recenzent neexistuje.");

  // Zamítnutí a pozastavení bez důvodu je k ničemu — člověk se nedozví,
  // co má napravit, a správce si po půl roce nevzpomene, proč to udělal.
  if ((rozhodnuti === "zamitnout" || rozhodnuti === "pozastavit") && !duvod) {
    return errorState("Napiš důvod — posílá se recenzentovi.", {
      errors: { duvod: "Důvod je povinný." },
    });
  }

  const novyStav =
    rozhodnuti === "schvalit" || rozhodnuti === "obnovit"
      ? "schvalen"
      : rozhodnuti === "zamitnout"
        ? "zamitnut"
        : "pozastaven";

  await rozhodniORecenzentovi(recenzentId, novyStav, duvod);

  const mail = mailRecenzentovaRozhodnuti(recenzent.email, novyStav, duvod);
  const odeslano = await sendMail(mail);

  revalidatePath("/admin/recenzenti");
  revalidatePath("/recenzenti");
  revalidatePath(`/recenzent/${recenzent.slug}`);

  return {
    status: "success",
    message: odeslano.ok
      ? "Hotovo, recenzentovi odešel e-mail."
      : `Hotovo, ale e-mail se nepodařilo odeslat (${odeslano.error}). Dej mu vědět jinak.`,
  };
}

// ── Námitky ─────────────────────────────────────────────────────────────────

export async function vyridNamitkuAkce(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await pozadujAdmina();

  const parsed = vyrizeniNamitkySchema.safeParse({
    namitkaId: formData.get("namitkaId"),
    rozhodnuti: formData.get("rozhodnuti"),
    vyrizeni: formData.get("vyrizeni"),
  });
  if (!parsed.success) {
    return errorState("Zkontroluj prosím formulář.", {
      errors: fieldErrors(parsed.error),
      values: formValues(formData),
    });
  }

  const { namitkaId, rozhodnuti, vyrizeni } = parsed.data;

  const vysledek = await vyridNamitku(namitkaId, rozhodnuti, vyrizeni);
  if (!vysledek) {
    return errorState("Tahle námitka už je vyřízená.");
  }

  const video = await najdiVideo(vysledek.youtubeId);
  const mail = mailNamitkaVyrizena(
    vysledek.kontakt,
    vysledek.youtubeId,
    video?.nazev ?? vysledek.youtubeId,
    rozhodnuti,
    vyrizeni,
  );
  const odeslano = await sendMail(mail);

  revalidatePath("/admin/namitky");
  revalidatePath("/admin");
  revalidatePath(`/video/${vysledek.youtubeId}`);
  revalidatePath("/katalog");

  return {
    status: "success",
    message: odeslano.ok
      ? "Vyřízeno, namítajícímu odešla odpověď."
      : `Vyřízeno, ale odpověď se nepodařilo odeslat (${odeslano.error}).`,
  };
}

// ── Pomocné ─────────────────────────────────────────────────────────────────

/** `https://www.youtube.com/@kurzgesagt` → `@kurzgesagt` */
function prezdivkaZUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const cesta = new URL(url).pathname.split("/").filter(Boolean)[0];
    return cesta?.startsWith("@") ? normalizujPrezdivku(cesta) : null;
  } catch {
    return null;
  }
}

