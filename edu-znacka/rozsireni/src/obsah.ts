import { api } from "./api";
import {
  nactiIndex,
  najdiKanal,
  najdiVideo,
  type Nalez,
  type UlozenyIndex,
} from "./index";
import { nactiNastaveni, type Nastaveni } from "./nastaveni";
import {
  ATRIBUT_ID,
  ATRIBUT_ZNACKY,
  postavZnacku,
  uklidZnacky,
} from "./znacka";
import { idVideaZHref, kanalZHref, kanalZKarty, najdiKartu } from "./youtube";

/**
 * Content script — vkládá značky do stránek YouTube.
 *
 * Index si načte z `storage.local` jednou a drží ho v paměti. Záměrně se
 * **neptá serveru ani servisnímu workeru**: dotaz na server by znamenal
 * posílat mu historii sledování, a MV3 worker se usíná, takže by se na něj
 * čekalo. Takhle je rozhodnutí okamžité a offline.
 */

const ZPRACOVANA_KARTA = "data-ez-hotovo";
const TRIDA_ZTLUMENO = "ez-ztlumeno";
const TRIDA_SKRYTO = "ez-skryto";

let index: UlozenyIndex;
let nastaveni: Nastaveni;

/** Utlumení — mřížka se při scrollování dolévá po kouskech. */
const UTLUMENI_MS = 150;
let naplanovano: number | undefined;

async function start() {
  [index, nastaveni] = await Promise.all([nactiIndex(), nactiNastaveni()]);

  projdiStranku();
  sledujZmeny();

  // Index se změní po synchronizaci, nastavení po kliknutí v popupu.
  // V obou případech se musí překreslit celá stránka.
  api.storage.onChanged.addListener((zmeny, oblast) => {
    void (async () => {
      if (oblast === "local" && zmeny.index) {
        index = await nactiIndex();
      } else if (oblast === "sync") {
        nastaveni = await nactiNastaveni();
      } else {
        return;
      }
      prekresli();
    })();
  });
}

/**
 * Smaže všechno, co rozšíření na stránku dalo, a projde ji znovu.
 *
 * Volá se při změně indexu nebo nastavení — tam nejde jen „dodělat zbytek“,
 * protože značka mohla i zmizet.
 */
function prekresli() {
  uklidZnacky();
  for (const prvek of document.querySelectorAll(`[${ZPRACOVANA_KARTA}]`)) {
    prvek.removeAttribute(ZPRACOVANA_KARTA);
    prvek.removeAttribute(ATRIBUT_ID);
    prvek.classList.remove(TRIDA_ZTLUMENO, TRIDA_SKRYTO);
  }
  projdiStranku();
}

function naplanujProchod() {
  if (naplanovano !== undefined) return;
  naplanovano = window.setTimeout(() => {
    naplanovano = undefined;
    projdiStranku();
  }, UTLUMENI_MS);
}

/**
 * Reakce na změny stránky.
 *
 * Dvě různé věci, obě potřebné:
 *  • `yt-navigate-finish` — YouTube je SPA, adresa se mění bez reloadu
 *    a content script se znovu nespustí.
 *  • `MutationObserver` — mřížka se dolévá při scrollování a doporučená
 *    videa dorazí až po načtení stránky.
 */
function sledujZmeny() {
  document.addEventListener("yt-navigate-finish", () => prekresli());

  new MutationObserver((zaznamy) => {
    for (const zaznam of zaznamy) {
      for (const pridany of zaznam.addedNodes) {
        // Ignorujeme vlastní vložené značky, jinak by se observer
        // spouštěl sám od sebe do nekonečna.
        if (
          pridany instanceof Element &&
          pridany.hasAttribute(ATRIBUT_ZNACKY)
        ) {
          continue;
        }
        naplanujProchod();
        return;
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
}

// ════════════════════════════════════════════════════════════════════════════

function projdiStranku() {
  oznacNahledy();
  if (location.pathname === "/watch") oznacNadpisVidea();
}

/**
 * Náhledy ve feedu, ve hledání, v doporučených, na kanálu, v playlistech.
 *
 * Hledá se podle odkazu s adresou videa, který obsahuje obrázek — to je
 * náhled. Nic dalšího o struktuře YouTube se nepředpokládá.
 */
function oznacNahledy() {
  const odkazy = document.querySelectorAll<HTMLAnchorElement>(
    'a[href*="/watch?v="], a[href*="/shorts/"]',
  );

  for (const odkaz of odkazy) {
    const youtubeId = idVideaZHref(odkaz.getAttribute("href"));
    if (!youtubeId) continue;

    // Odkaz bez obrázku je textový (titulek, „další videa“) — značku
    // dáváme na náhled, ať je vidět jednou, ne třikrát u jedné karty.
    if (!odkaz.querySelector("img")) continue;

    const karta = najdiKartu(odkaz);
    const cil = karta ?? odkaz;

    // YouTube svoje karty recykluje: tentýž element dostane po scrollu
    // jiný href. Proto se porovnává ID, ne jen „už zpracováno“.
    if (cil.getAttribute(ATRIBUT_ID) === youtubeId) continue;

    uklidZnacky(cil);
    cil.classList.remove(TRIDA_ZTLUMENO, TRIDA_SKRYTO);
    cil.setAttribute(ATRIBUT_ID, youtubeId);
    cil.setAttribute(ZPRACOVANA_KARTA, "1");

    const nalez = posud(youtubeId, kanalZKarty(karta));

    if (nalez) {
      pripojKNahledu(odkaz, postavZnacku(nalez, youtubeId, nastaveni.web, "nahled"));
    }

    uplatniRezim(cil, nalez);
  }
}

/** Značka na stránce videa — vedle nadpisu, ne na náhledu. */
function oznacNadpisVidea() {
  const youtubeId = idVideaZHref(location.href);
  if (!youtubeId) return;

  const nadpis = document.querySelector("h1");
  if (!nadpis) return;

  if (nadpis.getAttribute(ATRIBUT_ID) === youtubeId) return;

  uklidZnacky(nadpis);
  nadpis.setAttribute(ATRIBUT_ID, youtubeId);

  const nalez = posud(youtubeId, kanalStranky());
  if (!nalez) return;

  nadpis.append(postavZnacku(nalez, youtubeId, nastaveni.web, "nadpis"));
}

/**
 * Kanál na stránce videa.
 *
 * Bere se z odkazu pod přehrávačem. Na stránce je odkazů na kanály víc
 * (doporučená videa), ale ten vlastníka je v DOM před nimi, takže první
 * nalezený je ten správný — a kdyby se to změnilo, nejhorší následek je,
 * že se slabší značka kanálu neukáže.
 */
function kanalStranky(): string | null {
  const odkazy = document.querySelectorAll<HTMLAnchorElement>(
    'a[href^="/@"], a[href*="/channel/UC"]',
  );
  for (const odkaz of odkazy) {
    const kanal = kanalZHref(odkaz.getAttribute("href"));
    if (kanal) return kanal;
  }
  return null;
}

/**
 * Posouzení jednoho videa.
 *
 * Značka videa má přednost: je to silnější tvrzení (konkrétní video přečetl
 * odborník) než značka kanálu (kanál obecně drží úroveň).
 */
function posud(youtubeId: string, kanal: string | null): Nalez | null {
  const video = najdiVideo(index, youtubeId);
  if (video) return video;

  if (nastaveni.kanaly && kanal) return najdiKanal(index, kanal);

  return null;
}

/**
 * Ztlumení a skrývání podle režimu.
 *
 * Režim `jen-overena` **nebere značku kanálu** ani když je zapnutá —
 * kdo si zapne striktní filtr, chce videa s posudkem, ne videa z dobrého
 * kanálu.
 */
function uplatniRezim(karta: Element, nalez: Nalez | null) {
  if (nastaveni.rezim === "znacky") return;

  const projde = nalez?.druh === "video";
  if (projde) return;

  karta.classList.add(
    nastaveni.rezim === "jen-overena" ? TRIDA_SKRYTO : TRIDA_ZTLUMENO,
  );
}

/**
 * Vloží značku do náhledu.
 *
 * Náhled musí být `position: relative`, aby se značka dala umístit do jeho
 * rohu. YouTube to u některých náhledů má a u jiných ne, takže se to
 * nastaví, jen když je `static` — přepisovat jim rozložení není potřeba.
 */
function pripojKNahledu(odkaz: HTMLAnchorElement, znacka: HTMLAnchorElement) {
  if (getComputedStyle(odkaz).position === "static") {
    odkaz.style.position = "relative";
  }
  odkaz.append(znacka);
}

// Na `document_idle` už `document.body` existuje, ale YouTube umí script
// spustit i dřív — proto ta pojistka.
if (document.body) {
  void start();
} else {
  document.addEventListener("DOMContentLoaded", () => void start(), { once: true });
}
