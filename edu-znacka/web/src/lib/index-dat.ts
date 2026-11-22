import { OBORY_PORADI } from "./obory";
import type { IndexRadky } from "@/db/queries";

/**
 * Formát indexu, který si stahuje rozšíření.
 *
 * Tohle je **kontrakt s rozšířením** — když se tvar změní, musí se změnit
 * i `rozsireni/src/index.ts`. Proto je tu `format`: starší rozšíření pozná,
 * že odpovědi nerozumí, a sáhne si o plný index místo toho, aby tiše
 * zobrazovalo nesmysly.
 *
 * Proč takhle úsporně: index se stahuje celý, aby se server nedozvěděl,
 * co kdo sleduje. Záznam na video je dvouprvkové pole, ne objekt s klíči —
 * u 50 000 videí je to rozdíl asi 1 MB proti 3,5 MB.
 */
export const FORMAT_INDEXU = 1;

export type ZaznamVidea = [oborIndex: number, pocetRecenzi: number];
export type ZaznamKanalu = [oborIndex: number];

export type Index = {
  format: number;
  verze: number;
  vytvoreno: string;
  /** Plný index, nebo přírůstek od zadané verze. */
  plny: boolean;
  /** Slugy oborů; čísla v záznamech jsou indexy do tohohle pole. */
  obory: string[];
  /** ID videa → záznam, nebo `null` = značku ztratilo, smaž si ho. */
  videa: Record<string, ZaznamVidea | null>;
  /** ID kanálu → záznam, nebo `null` = smaž. */
  kanaly: Record<string, ZaznamKanalu | null>;
  /** `@prezdivka` → ID kanálu. Ve feedu často není nic jiného k dispozici. */
  prezdivky: Record<string, string>;
};

/**
 * Převede řádky z databáze do formátu po drátě.
 *
 * Řádek s jiným stavem než `overeno` se do indexu dostane jen v přírůstku
 * a jako `null` — tím rozšíření pozná, že si má záznam smazat. V plném
 * indexu takové řádky nejsou vůbec.
 */
export function postavIndex(radky: IndexRadky, plny: boolean): Index {
  const videa: Record<string, ZaznamVidea | null> = {};
  for (const v of radky.videa) {
    videa[v.youtubeId] =
      v.stav === "overeno"
        ? [oborIndex(v.obor), v.pocetRecenzi]
        : null;
  }

  const kanaly: Record<string, ZaznamKanalu | null> = {};
  const prezdivky: Record<string, string> = {};
  for (const k of radky.kanaly) {
    if (k.stav === "overeno") {
      kanaly[k.youtubeId] = [oborIndex(k.obor)];
      if (k.prezdivka) prezdivky[k.prezdivka] = k.youtubeId;
    } else {
      kanaly[k.youtubeId] = null;
      // přezdívku neposíláme — rozšíření si ji smaže podle ID kanálu
    }
  }

  return {
    format: FORMAT_INDEXU,
    verze: radky.verze,
    vytvoreno: new Date().toISOString(),
    plny,
    obory: OBORY_PORADI,
    videa,
    kanaly,
    prezdivky,
  };
}

/**
 * Index oboru v poli `OBORY_PORADI`.
 *
 * `-1` u oboru, který v pořadí není (přidaný do OBORY a zapomenutý
 * v OBORY_PORADI). Rozšíření pak značku ukáže bez názvu oboru — lepší než
 * spadnout nebo ukázat cizí obor.
 */
function oborIndex(slug: string): number {
  return OBORY_PORADI.indexOf(slug as (typeof OBORY_PORADI)[number]);
}
