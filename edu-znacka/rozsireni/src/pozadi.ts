import { api } from "./api";
import { synchronizuj } from "./index";
import { nactiNastaveni } from "./nastaveni";

/**
 * Servisní worker (v Chrome) / event page (ve Firefoxu).
 *
 * Jediná práce: udržovat lokální kopii indexu aktuální. Nic jiného tu být
 * nemá — v MV3 se worker kdykoli usne a probudí, takže žádný stav v paměti
 * tu nepřežije.
 */

const ALARM = "synchronizace";
/** Jednou denně stačí. Recenze nevznikají po minutách. */
const INTERVAL_MINUT = 60 * 24;
/** Po chybě (server nedostupný, offline) zkusíme dřív. */
const INTERVAL_PO_CHYBE_MINUT = 60;

const STAV_KLIC = "stavSynchronizace";

export type StavSynchronizace = {
  kdy: string;
  ok: boolean;
  /** Při chybě její popis, jinak prázdné. */
  chyba?: string;
  verze?: number;
};

async function synchronizujNyni(): Promise<void> {
  const { web } = await nactiNastaveni();
  const vysledek = await synchronizuj(web);

  const stav: StavSynchronizace = vysledek.ok
    ? { kdy: new Date().toISOString(), ok: true, verze: vysledek.verze }
    : { kdy: new Date().toISOString(), ok: false, chyba: vysledek.chyba };

  try {
    await api.storage.local.set({ [STAV_KLIC]: stav });
  } catch {
    // Kvóta nebo zakázané úložiště — popup pak jen neukáže čas poslední
    // synchronizace. Není důvod kvůli tomu nic shazovat.
  }

  if (!vysledek.ok) {
    console.warn("[Edu značka] Synchronizace selhala:", vysledek.chyba);
    // Zkusíme dřív než za den, ale ne hned — server může být zahlcený.
    api.alarms.create(ALARM, { delayInMinutes: INTERVAL_PO_CHYBE_MINUT });
  }
}

/** Naplánuje pravidelnou synchronizaci (alarmy přežijí uspání workeru). */
function naplanuj(): void {
  api.alarms.create(ALARM, {
    delayInMinutes: 1,
    periodInMinutes: INTERVAL_MINUT,
  });
}

api.runtime.onInstalled.addListener(() => {
  naplanuj();
  void synchronizujNyni();
});

// Po restartu prohlížeče se alarmy zachovají, ale po aktualizaci rozšíření
// nebo pádu workeru je potřeba se ujistit, že nějaký existuje.
api.runtime.onStartup.addListener(() => {
  naplanuj();
  void synchronizujNyni();
});

api.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM) void synchronizujNyni();
});

/** Ruční „Aktualizovat teď“ z popupu. */
api.runtime.onMessage.addListener((zprava, _odesilatel, odpoved) => {
  if ((zprava as { typ?: string })?.typ !== "synchronizuj") return false;

  void synchronizujNyni().then(() => odpoved({ hotovo: true }));
  // `true` = odpovíme asynchronně; bez toho se kanál zavře hned.
  return true;
});
