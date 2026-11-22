/**
 * Rozpoznávání YouTube adres a práce s oEmbed.
 *
 * Záměrně bez API klíče: `https://www.youtube.com/oembed` vrací název
 * a autora, nemá kvóty ani registraci a nevyžaduje projekt v Google Cloudu.
 * Pro to, co potřebujeme (název videa do katalogu), je to dost.
 *
 * Tenhle modul **nesmí** importovat nic serverového — používá ho i formulář
 * v prohlížeči pro okamžitou kontrolu vloženého odkazu.
 */

/** ID videa má vždycky přesně 11 znaků z téhle abecedy. */
const ID_VIDEA = /^[A-Za-z0-9_-]{11}$/;
/** ID kanálu začíná `UC` a má 24 znaků. */
const ID_KANALU = /^UC[A-Za-z0-9_-]{22}$/;

/**
 * Vytáhne ID videa z čehokoli, co člověk vloží do formuláře.
 *
 * Zvládne `watch?v=`, `youtu.be/`, `/shorts/`, `/embed/`, `/live/`, mobilní
 * `m.youtube.com`, adresy bez schématu i samotné ID. Ignoruje přívěsky
 * jako `&t=30s` nebo `&list=…`.
 *
 * Vrací `null`, když to na video nevypadá — formulář pak řekne, co čekal,
 * místo aby uložil nesmysl.
 */
export function idVidea(vstup: string): string | null {
  const text = vstup.trim();
  if (text === "") return null;

  // samotné ID
  if (ID_VIDEA.test(text)) return text;

  const url = parseUrl(text);
  if (!url) return null;

  if (!jeYoutubeHost(url.hostname)) return null;

  // youtu.be/ID
  if (url.hostname.replace(/^www\./, "") === "youtu.be") {
    const kandidat = url.pathname.split("/").filter(Boolean)[0];
    return kandidat && ID_VIDEA.test(kandidat) ? kandidat : null;
  }

  // watch?v=ID
  const v = url.searchParams.get("v");
  if (v && ID_VIDEA.test(v)) return v;

  // /shorts/ID, /embed/ID, /live/ID, /v/ID
  const casti = url.pathname.split("/").filter(Boolean);
  if (casti.length >= 2 && ["shorts", "embed", "live", "v"].includes(casti[0])) {
    return ID_VIDEA.test(casti[1]) ? casti[1] : null;
  }

  return null;
}

/**
 * Vytáhne z adresy kanálu buď jeho ID (`UC…`), nebo přezdívku (`@nazev`).
 *
 * Staré tvary `/c/nazev` a `/user/nazev` ID kanálu neobsahují a bez API klíče
 * se na něj nedá přeložit — v takovém případě se vrátí `{ prezdivka }`
 * a správce ID doplní ručně (najde ho ve zdroji stránky kanálu).
 */
export function rozpoznejKanal(
  vstup: string,
): { youtubeId?: string; prezdivka?: string } | null {
  const text = vstup.trim();
  if (text === "") return null;

  if (ID_KANALU.test(text)) return { youtubeId: text };
  if (/^@[A-Za-z0-9_.-]{3,30}$/.test(text)) return { prezdivka: text };

  const url = parseUrl(text);
  if (!url || !jeYoutubeHost(url.hostname)) return null;

  const casti = url.pathname.split("/").filter(Boolean);
  if (casti.length === 0) return null;

  if (casti[0] === "channel" && casti[1] && ID_KANALU.test(casti[1])) {
    return { youtubeId: casti[1] };
  }
  if (casti[0].startsWith("@")) {
    return { prezdivka: casti[0].toLowerCase() };
  }
  if ((casti[0] === "c" || casti[0] === "user") && casti[1]) {
    return { prezdivka: `@${casti[1].toLowerCase()}` };
  }

  return null;
}

export function jeIdVidea(value: string): boolean {
  return ID_VIDEA.test(value);
}

export function jeIdKanalu(value: string): boolean {
  return ID_KANALU.test(value);
}

/** Normalizuje přezdívku na `@malymipismeny`. */
export function normalizujPrezdivku(value: string): string | null {
  const text = value.trim().toLowerCase().replace(/^@+/, "");
  if (!/^[a-z0-9_.-]{3,30}$/.test(text)) return null;
  return `@${text}`;
}

export function urlVidea(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

export function urlNahledu(id: string): string {
  // mqdefault existuje u všech videí; maxres u starších ne
  return `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
}

function parseUrl(text: string): URL | null {
  try {
    // bez schématu by URL konstruktor spadl
    return new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
}

function jeYoutubeHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  return (
    host === "youtube.com" ||
    host === "youtu.be" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com" ||
    host.endsWith(".youtube.com")
  );
}

// ── oEmbed ──────────────────────────────────────────────────────────────────

export type OembedVysledek =
  | {
      ok: true;
      nazev: string;
      autor: string | null;
      /** Většinou `https://www.youtube.com/@handle`. */
      autorUrl: string | null;
    }
  /** Video neexistuje, je neveřejné, nebo smazané. */
  | { ok: false; chybi: true }
  /** Nepodařilo se zjistit (síť, rate limit). Video může existovat. */
  | { ok: false; chybi: false; chyba: string };

/**
 * Zjistí název a autora videa.
 *
 * `chybi: true` (HTTP 404/401) je užitečná informace sama pro sebe: znamená,
 * že video zmizelo nebo je neveřejné. Používá to i periodická kontrola, že
 * ověřená videa pořád existují.
 */
export async function nactiOembed(
  idVidea: string,
  fetchFn: typeof fetch = fetch,
): Promise<OembedVysledek> {
  const url =
    "https://www.youtube.com/oembed?format=json&url=" +
    encodeURIComponent(urlVidea(idVidea));

  try {
    const odpoved = await fetchFn(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });

    if (odpoved.status === 404 || odpoved.status === 401) {
      return { ok: false, chybi: true };
    }
    if (!odpoved.ok) {
      return {
        ok: false,
        chybi: false,
        chyba: `YouTube odpovědělo ${odpoved.status}.`,
      };
    }

    const data: unknown = await odpoved.json();
    if (typeof data !== "object" || data === null) {
      return { ok: false, chybi: false, chyba: "Nečekaná odpověď." };
    }

    const zaznam = data as Record<string, unknown>;
    const nazev =
      typeof zaznam.title === "string" ? zaznam.title.trim() : undefined;
    if (!nazev) {
      return { ok: false, chybi: false, chyba: "Odpověď neobsahuje název." };
    }

    return {
      ok: true,
      nazev,
      autor:
        typeof zaznam.author_name === "string"
          ? zaznam.author_name.trim()
          : null,
      autorUrl:
        typeof zaznam.author_url === "string" ? zaznam.author_url : null,
    };
  } catch (error) {
    return {
      ok: false,
      chybi: false,
      chyba: error instanceof Error ? error.message : String(error),
    };
  }
}
