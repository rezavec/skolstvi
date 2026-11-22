import { api } from "./api";

/**
 * Nastavení rozšíření.
 *
 * Ukládá se do `storage.sync`, takže volbu má člověk na všech svých
 * prohlížečích. Index do sync nejde — je na to moc velký a patří do
 * `storage.local`.
 */

export type Rezim = "znacky" | "ztlumit" | "jen-overena";

export type Nastaveni = {
  /**
   * `znacky`      — nic se neskrývá, jen se přidají značky (výchozí)
   * `ztlumit`     — neověřená videa zprůhlední
   * `jen-overena` — neověřená videa skryje
   */
  rezim: Rezim;
  /** Brát v potaz i slabší značku „důvěryhodný kanál“. */
  kanaly: boolean;
  /** Adresa webu — odkud se stahuje index a kam vede klik na značku. */
  web: string;
};

/**
 * `process.env.WEB_URL` nahrazuje esbuild při buildu skutečnou hodnotou
 * (viz build.mjs). V prohlížeči žádné `process` neexistuje — kdyby se sem
 * výraz dostal nenahrazený, rozšíření by spadlo, takže build musí
 * `define` nastavovat vždy.
 */
export const VYCHOZI_NASTAVENI: Nastaveni = {
  rezim: "znacky",
  kanaly: true,
  web: process.env.WEB_URL as string,
};

export async function nactiNastaveni(): Promise<Nastaveni> {
  try {
    const ulozene = await api.storage.sync.get(VYCHOZI_NASTAVENI);
    return { ...VYCHOZI_NASTAVENI, ...ulozene } as Nastaveni;
  } catch {
    // Privátní okno nebo zakázané úložiště — radši výchozí než spadnout.
    return VYCHOZI_NASTAVENI;
  }
}

export async function ulozNastaveni(zmena: Partial<Nastaveni>): Promise<void> {
  await api.storage.sync.set(zmena);
}
