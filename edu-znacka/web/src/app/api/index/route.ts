import type { NextRequest } from "next/server";
import { indexData } from "@/db/queries";
import { postavIndex } from "@/lib/index-dat";

/**
 * Index ověřených videí a kanálů pro rozšíření do prohlížeče.
 *
 * `GET /api/index`          → celý index (jen ověřené)
 * `GET /api/index?od=412`   → jen změny od verze 412, včetně odebraných
 *                             značek (ty přijdou jako `null`)
 *
 * Proč se stahuje celý index, a ne dotaz na jednotlivá videa: kdyby se
 * rozšíření ptalo server na každé video na obrazovce, server by znal
 * historii sledování každého uživatele. Takhle se o ní nedozví nic —
 * a je to i rychlejší a funguje to offline. Cena je ~300 kB při prvním
 * stažení, pak už jen přírůstky.
 *
 * Endpoint je veřejný a bez autentizace. Nic citlivého v něm není a nic
 * do něj nejde — je to jen seznam ID videí, která mají značku.
 *
 * Přírůstek funguje pro **jakoukoli** starou verzi: značka se nikdy nemaže
 * natvrdo, jen se mění stav řádku, takže `verze > od` vždy najde i to, co
 * značku ztratilo. Žádné „verze je moc stará, stáhni si to celé“ tu proto
 * není potřeba.
 */

/** Nikdy se neprerenderuje — obsah se mění s každou recenzí. */
export const dynamic = "force-dynamic";

/** Mění se s formátem odpovědi, ať se po nasazení neposílají staré cache. */
const FORMAT_ETAG = "1";

export async function GET(request: NextRequest) {
  let od = parsujOd(request.nextUrl.searchParams.get("od"));
  let radky = await indexData(od);

  // Klient tvrdí, že má novější verzi než my — typicky po obnově databáze
  // ze zálohy. Pošleme plný index, ať se srovná.
  if (od !== undefined && od > radky.verze) {
    od = undefined;
    radky = await indexData(undefined);
  }

  const plny = od === undefined;
  const data = postavIndex(radky, plny);

  const etag = `W/"${FORMAT_ETAG}-${data.verze}-${plny ? "plny" : od}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: hlavicky(etag) });
  }

  return Response.json(data, { headers: hlavicky(etag) });
}

/** Odpověď na preflight — rozšíření i cizí web si index může vzít. */
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "If-None-Match",
      "Access-Control-Max-Age": "86400",
    },
  });
}

function hlavicky(etag: string): HeadersInit {
  return {
    ETag: etag,
    // Rozšíření si stahuje index jednou denně, takže hodina v cache stačí
    // a ubere to špičky po nasazení nové recenze.
    "Cache-Control": "public, max-age=3600",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Expose-Headers": "ETag",
  };
}

/**
 * `?od=` musí být nezáporné celé číslo. Nesmysl se bere jako „žádné od“,
 * tedy plný index — to je bezpečnější než vrátit chybu, protože rozšíření
 * si tím vždycky pomůže.
 */
function parsujOd(raw: string | null): number | undefined {
  if (raw === null) return undefined;
  if (!/^\d{1,12}$/.test(raw)) return undefined;
  const cislo = Number(raw);
  return Number.isSafeInteger(cislo) ? cislo : undefined;
}
