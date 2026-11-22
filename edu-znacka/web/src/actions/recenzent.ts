"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  najdiVideo,
  ulozProfil,
  ulozRecenzi,
  volnySlug,
} from "@/db/queries";
import { pozadujSchvalenehoRecenzenta, prihlasenyRecenzent } from "@/lib/auth";
import { errorState, formValues, type FormState } from "@/lib/form-state";
import { sendMail } from "@/lib/mail";
import { mailSpravciNovaZadost } from "@/lib/mail-templates";
import { fieldErrors, profilSchema, recenzeSchema } from "@/lib/validation";

/**
 * Uložení profilu recenzenta.
 *
 * Profil se dá vyplnit i upravit kdykoli. Schválení se tím **neruší** —
 * jinak by každá oprava překlepu v titulu shodila všechny jeho značky.
 * Kdyby někdo profil po schválení přepsal na někoho jiného, je to vidět
 * v administraci a správce ho může pozastavit.
 */
export async function ulozProfilAkce(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const recenzent = await prihlasenyRecenzent();
  if (!recenzent) redirect("/pro-odborniky");

  const parsed = profilSchema.safeParse({
    jmeno: formData.get("jmeno"),
    titul: formData.get("titul"),
    instituce: formData.get("instituce"),
    orcid: formData.get("orcid"),
    profilUrl: formData.get("profilUrl"),
    obory: formData.getAll("obory"),
    souhlas: formData.get("souhlas"),
  });

  if (!parsed.success) {
    return errorState("Zkontroluj prosím formulář.", {
      errors: fieldErrors(parsed.error),
      // `formValues` si z FormData bere jen poslední hodnotu, takže obory
      // (víc zaškrtávátek se stejným `name`) se musí doplnit ručně —
      // jinak by se po chybě ztratily. Viz components/formulare.ts.
      values: { ...formValues(formData), obory: vybraneObory(formData) },
    });
  }

  const { jmeno, titul, instituce, orcid, profilUrl, obory } = parsed.data;
  const prvniVyplneni = recenzent.jmeno === "";

  await ulozProfil(recenzent.id, {
    jmeno,
    titul,
    instituce,
    orcid,
    profilUrl,
    obory,
    slug: await volnySlug(jmeno, recenzent.id),
  });

  revalidatePath("/odbornik/profil");
  revalidatePath("/admin/recenzenti");

  // Správci se ozveme jen při prvním vyplnění — ne při každé opravě.
  if (prvniVyplneni) {
    const mail = mailSpravciNovaZadost({ jmeno, instituce, obory, profilUrl, orcid });
    if (mail) await sendMail(mail);
  }

  return {
    status: "success",
    message: prvniVyplneni
      ? "Žádost je podaná. Ozveme se e-mailem, až ji projdeme — kontrolujeme, " +
        "že profil na stránkách instituce existuje a souhlasí."
      : "Profil uložený.",
  };
}

/** Zaškrtnuté obory jako řetězec oddělený čárkami, pro obnovu formuláře. */
function vybraneObory(formData: FormData): string {
  return formData
    .getAll("obory")
    .filter((v): v is string => typeof v === "string")
    .join(",");
}

/**
 * Uložení recenze.
 *
 * Značka se neudělí tady — stav videa se přepočítá v `ulozRecenzi`
 * z pravidla v `src/db/queries.ts`. Tahle akce jen ověří, že recenzent
 * smí v daném oboru mluvit.
 */
export async function ulozRecenziAkce(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const recenzent = await pozadujSchvalenehoRecenzenta();

  const youtubeId = String(formData.get("youtubeId") ?? "");
  const video = await najdiVideo(youtubeId);
  if (!video) return errorState("Takové video v databázi není.");

  const parsed = recenzeSchema.safeParse({
    verdikt: formData.get("verdikt"),
    obor: formData.get("obor"),
    zduvodneni: formData.get("zduvodneni"),
    zdroje: formData.get("zdroje"),
  });
  if (!parsed.success) {
    return errorState("Zkontroluj prosím formulář.", {
      errors: fieldErrors(parsed.error),
      values: formValues(formData),
    });
  }

  const { verdikt, obor, zduvodneni, zdroje } = parsed.data;

  // Fyzik nedává značku videu o dědičnosti. Kontroluje se to i v pravidle
  // značky, ale ohlásit to tady je k člověku slušnější než mlčky uložit
  // recenzi, která nikdy nebude platit.
  if (!recenzent.obory.includes(obor)) {
    return errorState(
      "V tomhle oboru nemáš schválené recenzování. Pokud se jím zabýváš, " +
        "přidej si ho v profilu — správce to projde.",
      { errors: { obor: "Obor není mezi tvými." }, values: formValues(formData) },
    );
  }

  if (obor !== video.obor) {
    return errorState(
      `Video je zařazené do oboru, který neodpovídá tvojí recenzi. ` +
        "Když je zařazené špatně, napiš správci — přeřadit ho může jen on.",
      { errors: { obor: "Obor nesouhlasí se zařazením videa." } },
    );
  }

  await ulozRecenzi({
    videoId: video.id,
    recenzentId: recenzent.id,
    verdikt,
    obor,
    zduvodneni,
    zdroje,
  });

  revalidatePath("/odbornik");
  revalidatePath(`/video/${youtubeId}`);
  revalidatePath(`/recenzent/${recenzent.slug}`);
  revalidatePath("/katalog");

  const poUlozeni = await najdiVideo(youtubeId);

  return {
    status: "success",
    message:
      poUlozeni?.stav === "overeno"
        ? "Recenze uložená — video má značku a objeví se v rozšíření při " +
          "nejbližší synchronizaci."
        : verdikt === "neodpovida"
          ? "Recenze uložená. Video značku nedostane. Nikde se nezveřejní, " +
            "že neprošlo — vidí to jen správce a ostatní recenzenti."
          : "Recenze uložená.",
  };
}
