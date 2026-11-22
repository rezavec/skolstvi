import { OBORY, OBORY_PORADI, UROVNE, UROVNE_PORADI } from "@/lib/obory";
import { inputClass } from "./ui";

/** Výběry oboru a úrovně. Jedno místo, ať je všude stejné pořadí a texty. */

export function VyberOboru({
  name = "obor",
  id = "obor",
  defaultValue,
  prazdnyText,
}: {
  name?: string;
  id?: string;
  defaultValue?: string;
  prazdnyText?: string;
}) {
  return (
    <select id={id} name={name} defaultValue={defaultValue ?? ""} className={inputClass}>
      <option value="">{prazdnyText ?? "— vyber obor —"}</option>
      {OBORY_PORADI.map((slug) => (
        <option key={slug} value={slug}>
          {OBORY[slug]}
        </option>
      ))}
    </select>
  );
}

export function VyberUrovne({
  name = "uroven",
  id = "uroven",
  defaultValue,
  prazdnyText,
}: {
  name?: string;
  id?: string;
  defaultValue?: string;
  prazdnyText?: string;
}) {
  return (
    <select id={id} name={name} defaultValue={defaultValue ?? ""} className={inputClass}>
      <option value="">{prazdnyText ?? "— vyber úroveň —"}</option>
      {UROVNE_PORADI.map((slug) => (
        <option key={slug} value={slug}>
          {UROVNE[slug].label}
        </option>
      ))}
    </select>
  );
}
