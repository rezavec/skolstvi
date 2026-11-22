"use client";

import { useState } from "react";
import type { FormState } from "@/lib/form-state";

/**
 * Obnova formuláře po odeslání.
 *
 * ── Problém ─────────────────────────────────────────────────────────────
 *
 * React 19 po dokončení akce formulář **resetuje**, stejně jako by to udělal
 * nativní submit. Textová pole to nevadí: vracejí se v `state.values`
 * a jsou v `defaultValue`, takže se po resetu nastaví správně.
 *
 * U zaškrtávátek a přepínačů to ale selže dvakrát:
 *
 *  1. Reset dělá prohlížeč, ne React. React o něm neví, takže při dalším
 *     překreslení porovná `checked` proti **své poslední vykreslené
 *     hodnotě** — ta se nezměnila, takže na DOM vůbec nesáhne a zaškrtnutí
 *     zůstane pryč. Nepomůže ani řízený input, ani oprava stavu v efektu.
 *  2. Pokud je takový input `required`, prohlížeč další odeslání rovnou
 *     zablokuje. Formulář pak **mlčky nejde odeslat** — žádná akce se
 *     nezavolá a uživatel vidí jen starou chybovou hlášku a nechápe proč.
 *
 * ── Řešení ──────────────────────────────────────────────────────────────
 *
 * Jediné, co React spolehlivě donutí sáhnout si na DOM, je přemountování.
 * `useKlicFormulare` vrací číslo, které se zvýší při každém novém výsledku
 * akce; dá se na `<form>` jako `key`, čímž se celý formulář vytvoří znovu
 * a všechna pole si vezmou hodnoty z `defaultValue` / `defaultChecked`.
 *
 * Předpokladem je, že akce vrací v `state.values` všechno, co má zůstat
 * vyplněné — včetně vícehodnotových polí, která si `formValues()` samo
 * neodnese (bere z FormData jen poslední hodnotu).
 *
 * Cenou je ztráta zaměření po neúspěšném odeslání. To je u formuláře,
 * kde si člověk jde přečíst chybovou hlášku, přijatelné; mlčky nefunkční
 * tlačítko ne.
 */
export function useKlicFormulare(state: FormState): number {
  const [klic, setKlic] = useState(0);
  const [poslednyState, setPoslednyState] = useState(state);

  // Úprava stavu při renderu (vzor z dokumentace Reactu). React takový
  // render zahodí a hned pustí nový, ještě než se cokoli vykreslí —
  // v `useEffect` by prohlížeč na okamžik ukázal formulář se starým klíčem.
  if (state !== poslednyState) {
    setPoslednyState(state);
    setKlic(klic + 1);
  }

  return klic;
}

/** Hodnota pole po odeslání, nebo výchozí. */
export function hodnotaPole(
  state: FormState,
  klic: string,
  vychozi: string | null,
): string {
  return state.values?.[klic] ?? vychozi ?? "";
}

/** Vícehodnotové pole (zaškrtávátka se stejným `name`) po odeslání. */
export function vybranePolozky(
  state: FormState,
  klic: string,
  vychozi: string[],
): string[] {
  const ulozene = state.values?.[klic];
  if (ulozene === undefined) return vychozi;
  return ulozene === "" ? [] : ulozene.split(",");
}

/** Zaškrtnutí po odeslání. */
export function jeZaskrtnuto(
  state: FormState,
  klic: string,
  vychozi: boolean,
): boolean {
  const ulozene = state.values?.[klic];
  if (ulozene === undefined) return vychozi;
  return ulozene === "on" || ulozene === "true";
}
