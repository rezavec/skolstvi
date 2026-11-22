import "server-only";
import { env } from "./env";
import { TOKEN_VALID_MINUTES } from "./magic-link";
import type { Mail } from "./mail";

/**
 * Texty e-mailů na jednom místě.
 *
 * Posílá se jich málo a schválně: přihlašovací odkaz, upozornění správci
 * na věc, která čeká na vyřízení, a zpráva člověku, že se jeho věc vyřídila.
 * Nic jiného — nikdo nechce další newsletter.
 *
 * Všechny mají jen textovou verzi. HTML by u takhle krátkých zpráv nic
 * nepřineslo a některé školní a univerzitní klienty ho stejně nezobrazí.
 */

export function mailPrihlasovaciOdkaz(to: string, odkaz: string): Mail {
  return {
    to,
    subject: "Přihlášení do Edu značky",
    text: `Přihlašovací odkaz do Edu značky:

${odkaz}

Odkaz platí ${TOKEN_VALID_MINUTES} minut a dá se použít jen jednou.

Pokud jsi o přihlášení nežádal, nic nedělej — bez kliknutí na odkaz
se nic nestane.
`,
  };
}

export function mailSpravciNovaZadost(zadost: {
  jmeno: string;
  instituce: string;
  obory: string[];
  profilUrl: string | null;
  orcid: string | null;
}): Mail | null {
  if (!env.adminNotifyEmail) return null;

  return {
    to: env.adminNotifyEmail,
    subject: `Nová žádost o recenzování: ${zadost.jmeno}`,
    text: `O recenzování žádá:

  Jméno:     ${zadost.jmeno}
  Instituce: ${zadost.instituce}
  Obory:     ${zadost.obory.join(", ")}
  Profil:    ${zadost.profilUrl ?? "neuveden"}
  ORCID:     ${zadost.orcid ?? "neuveden"}

Než ji schválíš, ověř si, že profil na stránkách instituce existuje
a že jméno a zaměření souhlasí.

${env.appUrl}/admin/recenzenti
`,
  };
}

export function mailSpravciNovaNamitka(namitka: {
  nazevVidea: string;
  youtubeId: string;
  jeAutor: boolean;
}): Mail | null {
  if (!env.adminNotifyEmail) return null;

  return {
    to: env.adminNotifyEmail,
    subject: namitka.jeAutor
      ? `Námitka OD AUTORA: ${namitka.nazevVidea}`
      : `Námitka: ${namitka.nazevVidea}`,
    text: `K videu „${namitka.nazevVidea}“ přišla námitka${
      namitka.jeAutor ? " od autora videa" : ""
    }.

Značka je od této chvíle pozastavená, takže v rozšíření už nesvítí.
Vyřiď to prosím — i zamítnutí je vyřízení.

${env.appUrl}/admin/namitky
`,
  };
}

export function mailRecenzentovaRozhodnuti(
  to: string,
  rozhodnuti: "schvalen" | "zamitnut" | "pozastaven",
  duvod: string | null,
): Mail {
  if (rozhodnuti === "schvalen") {
    return {
      to,
      subject: "Tvůj účet recenzenta je schválený",
      text: `Tvoje žádost o recenzování v Edu značce je schválená.

Co to znamená: u videí ze svých oborů můžeš napsat posudek a tím jim
udělit značku. Tvoje jméno, titul a instituce jsou u každé značky, kterou
podepíšeš, veřejně vidět — na tom stojí celá její hodnota.

Videa, která čekají na posudek:
${env.appUrl}/odbornik

Svůj veřejný profil si zkontroluj tady:
${env.appUrl}/odbornik/profil
`,
    };
  }

  if (rozhodnuti === "zamitnut") {
    return {
      to,
      subject: "K tvojí žádosti o recenzování",
      text: `Tvoje žádost o recenzování v Edu značce je zamítnutá.

${duvod ? `Důvod:\n${duvod}\n` : ""}
Pokud je to omyl nebo se něco změnilo, odpověz na tenhle e-mail.
`,
    };
  }

  return {
    to,
    subject: "Tvůj účet recenzenta je pozastavený",
    text: `Tvůj účet recenzenta v Edu značce je pozastavený, takže značky,
které jsi podepsal, se zatím nezobrazují.

${duvod ? `Důvod:\n${duvod}\n` : ""}
Pokud je to omyl, odpověz na tenhle e-mail.
`,
  };
}

export function mailNamitkaVyrizena(
  to: string,
  youtubeId: string,
  nazev: string,
  rozhodnuti: "vyhovet" | "zamitnout",
  vyrizeni: string,
): Mail {
  return {
    to,
    subject: `Tvoje námitka k videu „${nazev}“`,
    text:
      rozhodnuti === "vyhovet"
        ? `Tvoje námitka k videu „${nazev}“ byla přijata a značka byla odebrána.

${vyrizeni}

Díky — bez námitek by značka byla nevyvratitelná, a to si u tvrzení
o vědeckém konsenzu nemůže dovolit nikdo.

${env.appUrl}/video/${youtubeId}
`
        : `Tvoje námitka k videu „${nazev}“ byla posouzena a značka zůstává.

${vyrizeni}

Pokud s vyřízením nesouhlasíš, odpověz na tenhle e-mail.

${env.appUrl}/video/${youtubeId}
`,
  };
}
