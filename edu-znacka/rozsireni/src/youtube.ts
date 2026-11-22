/**
 * Čtení ID videí a kanálů z YouTube DOM.
 *
 * Zásadní rozhodnutí: **ID se bere z `href`, ne z DOM struktury.**
 *
 * YouTube přejmenovává svoje `ytd-*` elementy a třídy a mění hierarchii.
 * Selektory na komponenty (`ytd-rich-item-renderer > #content > …`) jsou
 * proto cesta k tomu, že rozšíření přestane fungovat při prvním redesignu
 * a nikdo si toho hned nevšimne. Adresa `/watch?v=ID` se naproti tomu
 * nezmění — je to veřejné URL, na které vedou odkazy z celého internetu.
 */

/** ID videa má vždycky přesně 11 znaků z téhle abecedy. */
const ID_VIDEA = /^[A-Za-z0-9_-]{11}$/;

/**
 * Vytáhne ID videa z hodnoty atributu href.
 *
 * Zvládne `/watch?v=ID`, `/shorts/ID`, `/embed/ID`, `/live/ID` i absolutní
 * adresy. Vrací `null`, když to na video nevypadá.
 */
export function idVideaZHref(href: string | null): string | null {
  if (!href) return null;

  // Relativní odkazy (těch je na YouTube většina) doplníme o základ,
  // aby se daly projít URL API — ruční parsování řetězce je zdroj chyb.
  let url: URL;
  try {
    url = new URL(href, "https://www.youtube.com");
  } catch {
    return null;
  }

  if (!jeYoutube(url.hostname)) return null;

  const v = url.searchParams.get("v");
  if (v && ID_VIDEA.test(v)) return v;

  const casti = url.pathname.split("/").filter(Boolean);

  // youtu.be/ID
  if (url.hostname.replace(/^www\./, "") === "youtu.be") {
    return casti[0] && ID_VIDEA.test(casti[0]) ? casti[0] : null;
  }

  if (casti.length >= 2 && ["shorts", "embed", "live", "v"].includes(casti[0])) {
    return ID_VIDEA.test(casti[1]) ? casti[1] : null;
  }

  return null;
}

/**
 * Vytáhne z href kanál — buď jeho ID (`UC…`), nebo přezdívku (`@nazev`).
 *
 * Náhled videa ve feedu obsahuje odkaz na kanál často jen jako `/@nazev`,
 * takže přezdívka musí fungovat stejně dobře jako ID.
 */
export function kanalZHref(href: string | null): string | null {
  if (!href) return null;

  let url: URL;
  try {
    url = new URL(href, "https://www.youtube.com");
  } catch {
    return null;
  }

  if (!jeYoutube(url.hostname)) return null;

  const casti = url.pathname.split("/").filter(Boolean);
  if (casti.length === 0) return null;

  if (casti[0] === "channel" && casti[1]?.startsWith("UC")) return casti[1];
  if (casti[0].startsWith("@")) return casti[0].toLowerCase();

  return null;
}

function jeYoutube(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  return (
    host === "youtube.com" ||
    host === "youtu.be" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com" ||
    host.endsWith(".youtube.com")
  );
}

/**
 * Najde „kartu“, do které odkaz patří — tedy nejbližšího předka, ve kterém
 * je zároveň odkaz na kanál.
 *
 * Používá se ke dvěma věcem: zjistit, čí to je kanál (pro slabší značku),
 * a mít co ztlumit nebo skrýt v režimech filtru. Jde se nejvýš `limit`
 * úrovní nahoru, aby se při neúspěchu nevybral půlka stránky.
 */
export function najdiKartu(odkaz: Element, limit = 10): Element | null {
  let prvek: Element | null = odkaz.parentElement;

  for (let i = 0; i < limit && prvek; i++) {
    if (prvek.querySelector('a[href^="/@"], a[href*="/channel/UC"]')) {
      return prvek;
    }
    prvek = prvek.parentElement;
  }
  return null;
}

/** Odkaz na kanál uvnitř karty. */
export function kanalZKarty(karta: Element | null): string | null {
  if (!karta) return null;

  const odkaz = karta.querySelector<HTMLAnchorElement>(
    'a[href^="/@"], a[href*="/channel/UC"]',
  );
  return kanalZHref(odkaz?.getAttribute("href") ?? null);
}
