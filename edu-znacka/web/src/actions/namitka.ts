"use server";

import { revalidatePath } from "next/cache";
import { najdiVideo, vytvorNamitku } from "@/db/queries";
import { errorState, formValues, type FormState } from "@/lib/form-state";
import { sendMail } from "@/lib/mail";
import { mailSpravciNovaNamitka } from "@/lib/mail-templates";
import { clientIp, zkontrolujRateLimit } from "@/lib/rate-limit";
import { fieldErrors, namitkaSchema } from "@/lib/validation";

/**
 * Podání námitky proti udělené značce.
 *
 * Formulář je veřejný a bez přihlášení — schválně. Kdo chce namítat, je
 * typicky autor videa nebo učitel, který na chybu narazil, a nutit ho
 * zakládat účet by znamenalo, že to prostě neudělá. Cena za to je rate
 * limit (sdílený s přihlašováním, počítá se na kontaktní adresu a IP).
 *
 * Značka se pozastaví **okamžitě**, ještě než námitku kdokoli posoudí
 * (viz `vytvorNamitku`). Opačné nastavení by znamenalo, že sporná značka
 * svítí dál, dokud se k ní někdo nedostane.
 */
export async function podejNamitkuAkce(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = namitkaSchema.safeParse({
    youtubeId: formData.get("youtubeId"),
    kontakt: formData.get("kontakt"),
    jeAutor: formData.get("jeAutor"),
    text: formData.get("text"),
  });

  if (!parsed.success) {
    return errorState("Zkontroluj prosím formulář.", {
      errors: fieldErrors(parsed.error),
      values: formValues(formData),
    });
  }

  const { youtubeId, kontakt, jeAutor, text } = parsed.data;

  const video = await najdiVideo(youtubeId);
  if (!video) {
    return errorState("Tohle video v databázi není, takže nemá ani značku.");
  }

  const ip = await clientIp();
  const limit = await zkontrolujRateLimit(kontakt, ip);
  if (!limit.povoleno) {
    return errorState(limit.duvod, { values: formValues(formData) });
  }

  await vytvorNamitku({ videoId: video.id, kontakt, jeAutor, text });

  const mail = mailSpravciNovaNamitka({
    nazevVidea: video.nazev,
    youtubeId: video.youtubeId,
    jeAutor: jeAutor === "ano",
  });
  if (mail) await sendMail(mail);

  revalidatePath(`/video/${youtubeId}`);
  revalidatePath("/katalog");
  revalidatePath("/admin/namitky");

  return {
    status: "success",
    message:
      "Námitka je podaná a značka je od této chvíle pozastavená — v rozšíření " +
      "už u videa nesvítí. Ozveme se na zadanou adresu, až to projdeme.",
  };
}
