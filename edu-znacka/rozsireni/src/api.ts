/**
 * Jedno API pro Chrome i Firefox.
 *
 * Firefox má `browser.*` s promisy, Chrome `chrome.*` — v MV3 už ale
 * i Chrome promisy umí, a Firefox `chrome.*` kvůli kompatibilitě taky
 * poskytuje. Stačí tedy vzít, co je k dispozici, a nevláčet s sebou
 * webextension-polyfill (40 kB) kvůli jednomu jmennému prostoru.
 */

type Api = typeof chrome;

declare const browser: Api | undefined;

export const api: Api =
  typeof browser !== "undefined" && browser?.storage
    ? browser
    : (globalThis as unknown as { chrome: Api }).chrome;
