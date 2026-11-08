/**
 * Stavba CSV pro český Excel.
 *
 * Dvě věci, bez kterých to v Excelu nedopadne dobře:
 *
 * 1. Oddělovač středník. Český Excel čte čárku jako desetinnou a soubor
 *    oddělený čárkami naskládá celý do jednoho sloupce.
 * 2. BOM na začátku. Bez něj Excel soubor přečte ve windows-1250 a místo
 *    diakritiky jsou „Ăˇ“ a podobné.
 *
 * A jedna bezpečnostní: hodnota začínající na =, +, - nebo @ se v Excelu
 * vyhodnotí jako formule. Popisy závad píšou lidi a může v nich být cokoli,
 * takže se takové hodnotě předsadí apostrof.
 */

const SEPARATOR = ";";
const BOM = "﻿";

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";

  let text = String(value);

  // ochrana proti vyhodnocení jako formule v Excelu / LibreOffice
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }

  // uvozovky se zdvojují, celá hodnota se obalí — tím projdou i středníky
  // a odřádkování uvnitř textu
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildCsv(
  headers: string[],
  rows: unknown[][],
): string {
  const lines = [
    headers.map(escapeCell).join(SEPARATOR),
    ...rows.map((row) => row.map(escapeCell).join(SEPARATOR)),
  ];
  // CRLF — s tím nemá problém Excel ani tabulkové procesory na Macu
  return BOM + lines.join("\r\n") + "\r\n";
}
