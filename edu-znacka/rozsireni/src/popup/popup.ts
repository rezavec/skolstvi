import { api } from "../api";
import { nactiIndex, pocetKanalu, pocetOverenych } from "../index";
import { nactiNastaveni, ulozNastaveni, type Rezim } from "../nastaveni";
import type { StavSynchronizace } from "../pozadi";

/**
 * Popup — přepínače režimu a stav synchronizace.
 *
 * Záměrně nemá vlastní nastavovací stránku: jsou tu dvě volby a odkaz na
 * katalog, na to je zbytečná.
 */

const prvky = {
  kanaly: document.querySelector<HTMLInputElement>("#kanaly")!,
  pocty: document.querySelector<HTMLParagraphElement>("#pocty")!,
  synchronizace: document.querySelector<HTMLParagraphElement>("#synchronizace")!,
  aktualizovat: document.querySelector<HTMLButtonElement>("#aktualizovat")!,
  odkazKatalog: document.querySelector<HTMLAnchorElement>("#odkaz-katalog")!,
  odkazJak: document.querySelector<HTMLAnchorElement>("#odkaz-jak")!,
};

async function vykresli() {
  const [nastaveni, index] = await Promise.all([nactiNastaveni(), nactiIndex()]);

  for (const radio of document.querySelectorAll<HTMLInputElement>(
    'input[name="rezim"]',
  )) {
    radio.checked = radio.value === nastaveni.rezim;
  }
  prvky.kanaly.checked = nastaveni.kanaly;

  prvky.odkazKatalog.href = `${nastaveni.web}/katalog`;
  prvky.odkazJak.href = `${nastaveni.web}/jak-to-funguje`;

  const videi = pocetOverenych(index);
  const kanalu = pocetKanalu(index);

  prvky.pocty.textContent =
    videi === 0 && kanalu === 0
      ? "Index je zatím prázdný."
      : `${videi} ${skloňujVidea(videi)} · ${kanalu} ${skloňujKanaly(kanalu)}`;

  const stav = await nactiStav();
  prvky.synchronizace.textContent = popisStavu(stav, index.stazeno);
}

function popisStavu(stav: StavSynchronizace | null, stazeno: string): string {
  if (stav && !stav.ok) {
    return `Poslední pokus selhal: ${stav.chyba}. Zkusíme to znovu sami.`;
  }
  if (!stazeno) return "Ještě se nic nestáhlo.";
  return `Aktualizováno ${formatKdy(stazeno)}.`;
}

async function nactiStav(): Promise<StavSynchronizace | null> {
  try {
    const ulozene = await api.storage.local.get("stavSynchronizace");
    return (ulozene.stavSynchronizace as StavSynchronizace) ?? null;
  } catch {
    return null;
  }
}

function formatKdy(iso: string): string {
  const kdy = new Date(iso);
  const minut = Math.round((Date.now() - kdy.getTime()) / 60000);

  if (minut < 2) return "právě teď";
  if (minut < 60) return `před ${minut} min`;

  const hodin = Math.round(minut / 60);
  if (hodin < 24) return `před ${hodin} h`;

  return new Intl.DateTimeFormat("cs-CZ", {
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(kdy);
}

function skloňujVidea(n: number): string {
  if (n === 1) return "ověřené video";
  if (n >= 2 && n <= 4) return "ověřená videa";
  return "ověřených videí";
}

function skloňujKanaly(n: number): string {
  if (n === 1) return "důvěryhodný kanál";
  if (n >= 2 && n <= 4) return "důvěryhodné kanály";
  return "důvěryhodných kanálů";
}

// ── Obsluha ─────────────────────────────────────────────────────────────────

for (const radio of document.querySelectorAll<HTMLInputElement>(
  'input[name="rezim"]',
)) {
  radio.addEventListener("change", () => {
    if (radio.checked) void ulozNastaveni({ rezim: radio.value as Rezim });
  });
}

prvky.kanaly.addEventListener("change", () => {
  void ulozNastaveni({ kanaly: prvky.kanaly.checked });
});

prvky.aktualizovat.addEventListener("click", () => {
  prvky.aktualizovat.disabled = true;
  prvky.synchronizace.textContent = "Aktualizuju…";

  api.runtime.sendMessage({ typ: "synchronizuj" }, () => {
    prvky.aktualizovat.disabled = false;
    void vykresli();
  });
});

void vykresli();
