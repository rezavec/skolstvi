import type { Nalez } from "./index";

/**
 * Vykreslení značky do stránky YouTube.
 *
 * Značka je obyčejný `<a>`, ne jen nálepka: **kliknutím vede na detail
 * videa na webu**, kde je vidět kdo ji dal, kdy a proč. Bez téhle cesty by
 * to byla značka, které se musí věřit, a tím by celý projekt ztratil smysl.
 */

/** Předpona ve všech třídách, ať nekolidujeme se třídami YouTube. */
const P = "ez";

/** Značka se do stránky vkládá s tímhle atributem, ať se dá najít a uklidit. */
export const ATRIBUT_ZNACKY = "data-ez-znacka";
/** Na kartě si pamatujeme, pro které ID je značka vykreslená. */
export const ATRIBUT_ID = "data-ez-id";

export type Umisteni = "nahled" | "nadpis";

export function postavZnacku(
  nalez: Nalez,
  youtubeId: string,
  web: string,
  umisteni: Umisteni,
): HTMLAnchorElement {
  const jeVideo = nalez.druh === "video";

  const prvek = document.createElement("a");
  prvek.setAttribute(ATRIBUT_ZNACKY, nalez.druh);
  prvek.className = `${P}-znacka ${P}-${nalez.druh} ${P}-${umisteni}`;

  prvek.href = `${web}/video/${youtubeId}`;
  prvek.target = "_blank";
  prvek.rel = "noreferrer noopener";

  // Klik na značku nesmí spustit přehrávání videa pod ní.
  prvek.addEventListener("click", (e) => e.stopPropagation());

  const popis = jeVideo
    ? nalez.obor
      ? `Ověřeno odborníkem z oboru ${nalez.obor}` +
        (nalez.pocetRecenzi > 1 ? `, ${nalez.pocetRecenzi} posudky` : "")
      : "Ověřeno odborníkem"
    : nalez.obor
      ? `Důvěryhodný kanál, obor ${nalez.obor}`
      : "Důvěryhodný kanál";

  prvek.setAttribute("role", "img");
  prvek.setAttribute("aria-label", `${popis}. Otevře podrobnosti.`);
  prvek.title = `${popis}\nKlikni pro posudek a jméno recenzenta.`;

  prvek.append(ikona(jeVideo));

  const text = document.createElement("span");
  text.className = `${P}-text`;
  text.textContent = jeVideo
    ? nalez.obor
      ? `ověřeno · ${nalez.obor}`
      : "ověřeno"
    : "důvěryhodný kanál";
  prvek.append(text);

  return prvek;
}

/**
 * Dvě různé ikony, ne jen dvě barvy.
 *
 * Rozdíl mezi „ověřeno“ a „důvěryhodný kanál“ musí být poznat i pro toho,
 * kdo zelenou od modré nerozliší.
 */
function ikona(jeVideo: boolean): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", `${P}-ikona`);

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "currentColor");
  path.setAttribute(
    "d",
    jeVideo
      ? // fajfka v kolečku
        "M8 0a8 8 0 100 16A8 8 0 008 0zm3.86 5.47L7.4 11.1a.75.75 0 01-1.1.07L3.9 8.9a.75.75 0 111.02-1.1l1.8 1.68 3.95-5a.75.75 0 011.18.93z"
      : // trojúhelník v hranatém rámečku
        "M2 4.5A2.5 2.5 0 014.5 2h7A2.5 2.5 0 0114 4.5v7a2.5 2.5 0 01-2.5 2.5h-7A2.5 2.5 0 012 11.5v-7zm4.75 1.7v3.6c0 .3.33.49.59.34l3.1-1.8a.4.4 0 000-.68l-3.1-1.8a.4.4 0 00-.59.34z",
  );

  svg.append(path);
  return svg;
}

/** Smaže značky, které do stránky vložilo rozšíření. */
export function uklidZnacky(koren: ParentNode = document): void {
  for (const prvek of koren.querySelectorAll(`[${ATRIBUT_ZNACKY}]`)) {
    prvek.remove();
  }
}
