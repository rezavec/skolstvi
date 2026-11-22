# Edu značka

Rozšíření do prohlížeče, které u videí na YouTube ukáže, **která z nich
přečetl odborník z oboru a potvrdil, že jejich obsah odpovídá současnému
vědeckému konsenzu.** K tomu web, kde taková značka vzniká a kde je u každé
vidět, kdo ji dal a proč.

Smysl je jednoduchý: žák ani učitel nemá jak na první pohled poznat, jestli
se z videa naučí něco, co platí, nebo autorův výmysl. Tohle mu to ukáže
přímo v místě, kde se rozhoduje — u náhledu videa.

```
edu-znacka/
├── web/         Next.js — databáze, administrace, katalog, /api/index
└── rozsireni/   MV3 rozšíření pro Chrome, Edge, Brave, Opera a Firefox
```

---

## Jak se značka uděluje

Tohle je jádro projektu, zbytek jen obsluhuje těchhle pět kroků.

```
1. Odborník se registruje
   akademický e-mail → magic link → profil (jméno, titul, instituce,
   obory, ORCID nebo odkaz na profil na webu instituce)
                            ↓
2. Správce žádost schválí  (/admin/recenzenti)
   ručně dohledá profil na stránkách instituce a ověří, že souhlasí
                            ↓
3. Recenzent napíše posudek
   verdikt + obor + zdůvodnění + zdroje, podepsané jeho jménem
                            ↓
4. Značka vznikne automaticky, když platí VŠECHNO:
   • existuje posudek s verdiktem „odpovídá konsenzu“
   • od recenzenta, který je v daný moment schválený
   • z oboru, který se rovná oboru videa
   • a ten obor má recenzent ve svém profilu
   • na videu není otevřená námitka
   • značka nebyla odebrána po vyhovění námitce
                            ↓
5. Video se dostane do indexu → rozšíření ho při nejbližší
   synchronizaci ukáže
```

**Stav videa se nikdy nenastavuje ručně.** Vždy se počítá z posudků
a námitek (`prepocitejStavVidea` v `web/src/db/queries.ts`), takže nemůže
vzniknout značka, ke které by neexistoval podepsaný důvod. Pozastavení
recenzenta, přeřazení videa do jiného oboru i námitka značku odeberou samy.

### Kdo ověřuje ověřovatele

Tři vrstvy, žádná sama nestačí:

1. **Akademický e-mail.** Přihlašovací odkaz jde jen na doménu ze seznamu
   v `ACADEMIC_EMAIL_DOMAINS`. Dokazuje, že člověk tu adresu ovládá.
2. **Ruční schválení.** Správce dohledá profil na stránkách instituce
   a ověří jméno i zaměření.
3. **Veřejná dohledatelnost.** Každý recenzent má veřejný profil se všemi
   svými posudky. Kdo značce nevěří, může si přečíst, kdo ji dal a proč.
   To je nakonec ta nejsilnější kontrola.

> **Kontrola domény je na tečce, ne na „končí na“.** Fakultní adresy jsou
> subdomény (`mff.cuni.cz`), takže se musí pouštět — ale `evil-cuni.cz`
> ani `cuni.cz.utocnik.cz` projít nesmí. Pravidlo je v
> `web/src/lib/magic-link.ts` a je na něj test.

### Dvě značky, ne jedna

| Značka | Co znamená | Kdo ji dává |
| --- | --- | --- |
| **ověřeno · Fyzika** (zelená) | Konkrétní video přečetl odborník z oboru a stojí za tím pod jménem | Recenzent |
| **důvěryhodný kanál** (modrá) | Kanál dlouhodobě drží úroveň, ale tohle video nikdo nerecenzoval | Správce |

Druhá je slabší tvrzení a musí vypadat jinak, jinak by se význam té první
rozmělnil. Dá se v rozšíření vypnout a striktní filtr ji nebere. Bez ní by
byl ale index první měsíce skoro prázdný a rozšíření by vypadalo rozbité —
je to přiznaný kompromis, ne náhrada posudku.

### Proč není značka „tohle je špatně“

Byla by užitečná přesně na ty případy, kdy žák přinese video o ploché Zemi.
Projekt ji přesto nemá:

- Veřejně vystavené „tohle video je nesmysl“ u jmenovaného autora je zásah
  do jeho dobré pověsti. Musel by být doložitelný a muselo by existovat
  řádné rozporové řízení — to je jiný projekt.
- Rozlišit „je to špatně“ od „je to zjednodušené“ nebo „je to starší pohled“
  je u školních videí často věc názoru, a značka má být jednoznačná.

Záporný posudek se proto ukládá (aby druhý recenzent nedělal stejnou práci
dvakrát), ale **nikde se nezveřejňuje.** Je na to test.

---

## Rozchození na vlastním počítači

Potřebuješ **Node.js 20.9+** a nějaký **PostgreSQL**.

### Web

```bash
cd edu-znacka/web && npm install
```

```bash
cp .env.example .env.local
```

V `.env.local` vyplň aspoň tyhle čtyři:

| Proměnná | Co tam dát |
| --- | --- |
| `DATABASE_URL` | `postgres://uzivatel@localhost:5432/znacka`, nebo connection string z Neonu |
| `APP_SECRET` | vygeneruj: `openssl rand -base64 48` |
| `ADMIN_PASSWORD` | tvoje heslo do `/admin` |
| `ACADEMIC_EMAIL_DOMAINS` | nech, jak je — seznam českých vysokých škol a AV |

`MAIL_DRIVER` nech na `console` — maily se nikam neodešlou, jen se vypíšou
do terminálu a uloží do `.dev-mail/last.json`. Díky tomu si projdeš
i přihlášení bez nastavování Resendu.

```bash
npm run db:push
```

```bash
npm run dev
```

Otevři `http://localhost:3000`. Do administrace se dostaneš na `/admin`.

### Rozšíření

```bash
cd edu-znacka/rozsireni && npm install && npm run build
```

Vznikne `dist-chrome/` a `dist-firefox/`.

- **Chrome, Edge, Brave, Opera:** `chrome://extensions` → zapni *Režim pro
  vývojáře* → *Načíst rozbalené* → vyber `dist-chrome/`.
- **Firefox:** `about:debugging#/runtime/this-firefox` → *Načíst dočasný
  doplněk* → vyber `dist-firefox/manifest.json`.

Rozšíření se připojí na `http://localhost:3000`. Index si stáhne hned po
instalaci a pak jednou denně; v popupu je tlačítko *Aktualizovat teď*.

---

## Nasazení

### 1. Databáze (Neon)

Založ projekt na [neon.tech](https://neon.tech), **region v EU** (Frankfurt),
a zkopíruj si connection string. **Vezmi ten s `-pooler` v adrese** — bez něj
by si každá serverless instance držela vlastní spojení a databáze by je brzy
začala odmítat.

### 2. Web na Vercelu

Naimportuj repozitář a **nastav Root Directory na `edu-znacka/web`**
(Settings → General → Root Directory). Bez toho Vercel hledá aplikaci
v kořeni repozitáře a nenajde ji.

Do Environment Variables dej všechno z `.env.example`. `APP_URL` nastav na
veřejnou adresu, **bez lomítka na konci**.

Po prvním nasazení vytvoř tabulky — z vlastního počítače, s `DATABASE_URL`
nastavenou na Neon:

```bash
npm run db:push
```

### 3. E-maily (Resend)

1. Založ účet na [resend.com](https://resend.com) a přidej svoji doménu.
2. Resend ukáže **DNS záznamy** (SPF, DKIM a návratovou cestu) — musí je
   přidat ten, kdo doménu spravuje.
3. Počkej na ověření (většinou do hodiny) a nastav ve Vercelu
   `MAIL_DRIVER=resend`, `RESEND_API_KEY`, `MAIL_FROM` a `ADMIN_NOTIFY_EMAIL`.

Dokud DNS záznamy nemáš, nech `MAIL_DRIVER=console`.

### 4. Rozšíření do storů

Adresa webu je v rozšíření na dvou místech (host permission v manifestu
a výchozí nastavení), takže se **propisuje z jedné proměnné při buildu**:

```bash
WEB_URL=https://znacka.tvojedomena.cz npm run build
```

```bash
WEB_URL=https://znacka.tvojedomena.cz npm run zip
```

Vzniknou `dist-chrome.zip` a `dist-firefox.zip`.

- **Chrome Web Store** — [Developer Dashboard](https://chrome.google.com/webstore/devconsole),
  jednorázový poplatek 5 USD, schvalování pár dní. Vyžaduje veřejnou adresu
  se zásadami ochrany údajů — je na `/soukromi`.
- **Firefox** — [addons.mozilla.org](https://addons.mozilla.org/developers/),
  zdarma.

**Pro školu:** instalaci se dá vynutit přes `ExtensionInstallForcelist`
(Google Admin Console u Chromebooků, nebo GPO ve Windows), takže si ji žáci
nemusí instalovat sami.

---

## Ověření, že všechno funguje

Tři testy, každý na něco jiného. Všechny jsou psané tak, aby padaly na
skutečných chybách, ne na drobnostech okolo.

### Pravidlo značky

Nejdůležitější test v projektu — ověřuje přímo proti databázi, že značka
vzniká a mizí přesně podle pravidla výš.

```bash
cd edu-znacka/web && npm run test:pravidlo
```

Projde mimo jiné: že recenze od neschváleného recenzenta značku nedá, že
fyzik nedá značku videu o biologii, že pozastavení recenzenta jeho značky
odebere, že námitka značku pozastaví okamžitě a že kladný posudek značku
po vyhovění námitce **nevrátí**.

> Test si **vymaže databázi** (TRUNCATE) a sám se zastaví, pokud
> `DATABASE_URL` nevypadá jako lokální.

### Celá aplikace

```bash
cd edu-znacka/web && npm run dev
```

```bash
npm install -D playwright && npx playwright install chromium
```

```bash
npm run smoke
```

Projde celou cestu: registrace odborníka → magic link z `.dev-mail` →
profil → schválení → posudek → značka → index → katalog → námitka →
vyřízení. A kontroly, které se ručně testují blbě: že se záporný posudek
nikde nezveřejní, že `evil-cuni.cz` neprojde kontrolou domény, že jeden
přihlašovací odkaz jde použít jen jednou a že drží rate limit.

> Zakládá recenzenty, videa i námitky a zabere část hodinového rate limitu.
> **Pouštěj ho jen na vývojové databázi.**

### Rozšíření

```bash
cd edu-znacka/rozsireni && npm run build && npm run smoke
```

Spustí opravdový Chromium s načteným rozšířením proti **lokálním fixture
souborům**, které se vydávají za youtube.com. Díky tomu padá, když se rozbije
rozšíření, ne když YouTube vydá redesign nebo ukáže souhlas s cookies.

Kontroluje, že značka je u správných videí a jen u nich, že vede na detail
na webu, že funguje i pro Shorts a pro kanál zadaný přezdívkou, že se
opakovaným průchodem nezdvojí, že režimy ztlumení a skrývání dělají, co mají,
a že odebraná značka zmizí i lokálně.

Živá kontrola na skutečném YouTube je za přepínačem — ověří jen to, jestli
pořád platí předpoklad, na kterém hledání videí stojí:

```bash
SMOKE_LIVE=1 npm run smoke
```

> **Past:** `headless: true` v Playwrightu spouští „headless shell“, a ten
> rozšíření vůbec nenačte — test by tiše procházel na prázdno. Proto se
> spouští plný Chromium s `--headless=new` a první kontrolou je, že se
> rozšíření opravdu načetlo.

---

## Jak je to postavené

| Vrstva | Čím |
| --- | --- |
| Web | Next.js 16 (App Router), React 19, TypeScript, Tailwind 4 |
| Databáze | PostgreSQL + Drizzle ORM |
| Přihlášení | vlastní, podepsaný JWT v httpOnly cookie (`jose`) |
| E-maily | Resend, nebo `console` driver pro vývoj |
| Validace | Zod |
| Rozšíření | MV3, TypeScript, esbuild, bez frameworku a bez závislostí |

### Pár rozhodnutí, která stojí za vysvětlení

**Proč rozšíření stahuje celý index, místo aby se ptalo serveru.** Kdyby se
ptalo na každé video na obrazovce, server by znal historii sledování každého
uživatele — u nástroje pro děti je to nepřijatelné. Takhle se rozhoduje
u člověka v prohlížeči a server se nedozví nic. Bonus: funguje to offline
a bez latence. Cena je ~300 kB při prvním stažení, pak už jen přírůstky.

**Proč se ID videa bere z `href`, ne z DOM struktury.** YouTube přejmenovává
svoje `ytd-*` elementy a mění hierarchii, takže selektory na komponenty jsou
cesta k tomu, že rozšíření přestane fungovat při prvním redesignu a nikdo si
toho nevšimne. Adresa `/watch?v=ID` se nezmění — vedou na ni odkazy z celého
internetu.

**Proč je verze indexu v tabulce, a ne v sekvenci.** `UPDATE … RETURNING`
drží na řádku zámek až do commitu, takže se verze přidělují v pořadí commitů.
U sekvence (ani u `now()`) to neplatí: transakce, která si vzala verzi dřív,
může commitnout později, a rozšíření by si při synchronizaci přesně na té
hranici záznam přeskočilo a nikdy se k němu nevrátilo. Viz komentář
u `citacVerze` v `web/src/db/schema.ts`.

**Proč se nic nemaže natvrdo.** Odebrání značky je změna stavu řádku, ne
`DELETE`. Díky tomu stačí na přírůstkovou synchronizaci `WHERE verze > N` —
odebraná značka se v přírůstku objeví jako `null` a rozšíření si ji smaže.
S mazáním by byla potřeba tabulka hrobečků.

**Proč je v administraci jeden seznam místo dvou sekcí.** Kdyby se čekající
a vyřízené žádosti renderovaly ve dvou `<ul>`, přesunula by se karta po
schválení z jednoho do druhého, React by komponentu odmontoval a zmizel by
i výsledek akce — včetně upozornění, že se nepodařilo odeslat e-mail.

**Proč jsou zaškrtávátka řízená a bez `required`.** React 19 po dokončení
akce formulář resetuje jako při nativním odeslání. O tom resetu neví, takže
řízený input nepřekreslí a zaškrtnutí se ztratí — a pokud je `required`,
prohlížeč další odeslání **mlčky zablokuje**. Řeší to
`web/src/components/formulare.ts`; důvod je popsaný přímo tam.

**Proč se duplikuje kód z helpdesku.** `session.ts`, `magic-link.ts`,
`rate-limit.ts`, `env.ts` a UI komponenty jsou zkopírované a upravené,
ne sdílené. README repozitáře staví na tom, že každý projekt je samostatná
složka s vlastním Root Directory ve Vercelu; sdílený balíček by znamenal
npm workspaces a konfiguraci buildu u obou projektů. Za ušetřených ~400
řádků to nestojí.

### Bezpečnost

- **Doména** se kontroluje na tečce (rovnost nebo pravá subdoména), ne
  pouhým „končí na“ — jinak by `evil-cuni.cz` prošlo a útočník by na
  veřejném profilu vystupoval jako odborník z Univerzity Karlovy.
- **Rate limit:** 5 odkazů na adresu a 20 z jedné IP za hodinu. Platí
  i pro formulář námitky.
- **Token** je 32 náhodných bajtů, v databázi jen jeho SHA-256 hash,
  jednorázový, platnost 30 minut. Spotřebuje se jediným atomickým `UPDATE`,
  takže dvě souběžná kliknutí nemůžou projít obě.
- **Heslo správce** se porovnává v konstantním čase.
- **Stav recenzenta se čte z databáze, ne z cookie.** Cookie platí 90 dní —
  kdyby v ní stav byl, pozastavený recenzent by mohl recenzovat dál až do
  jejího vypršení.
- **Server Actions si ověřují přihlášení samy.** Guard v layoutu chrání jen
  zobrazení stránek; akce se dají zavolat POSTem mimo UI.
- **Rozšíření si bere minimum oprávnění:** `storage`, `alarms` a hostitele
  jen pro `youtube.com` a doménu webu. Žádné `tabs`, žádné `<all_urls>`.

### Osobní údaje (GDPR)

- **Jméno, titul a instituce recenzenta se zveřejňují** — v tom je celá
  hodnota značky. Souhlas se vyžaduje při vyplnění profilu a bez něj
  registrace nejde dokončit.
- **E-maily recenzentů a autorů námitek se nezveřejňují nikdy.**
- **Rozšíření neposílá nikam nic o tom, co kdo sleduje.** To je i důvod,
  proč stahuje celý index — a ta věta patří do popisu ve storu.
- Záporné posudky zůstávají interní.
- Databáze v EU regionu.
- Zásady jsou na `/soukromi` a **story je vyžadují jako podmínku vydání.**

---

## Co v téhle verzi záměrně není

**Přihlášení přes ORCID.** Zpříjemnilo by ověřování, ale chce registraci
klienta a další flow. Pole `orcid` je v profilu od začátku včetně kontroly
kontrolní číslice a zveřejňuje se jako odkaz — čtenář si ho ověří sám.
OAuth se dá doplnit bez změny schématu.

**Negativní značka.** Důvody výš. Dala by se doplnit, ale potřebuje
rozporové řízení a právní rozmyšlení, ne jen další stav v databázi.

**Jiné platformy než YouTube.** A Safari — to chce Xcode a účet u Apple.

**Automatické napovídání videí k recenzi** podle sledovanosti nebo oboru.
Zajímavé, ale až bude koho zavalit prací.

Dál se nabízí: hromadný import videí ze seznamu, periodická kontrola, že
ověřená videa na YouTube pořád existují (oEmbed na to umí odpovědět, funkce
`oznacZkontrolovano` na to čeká), a export katalogu pro školní systémy.

---

## Struktura

```
web/src/
├── app/
│   ├── page.tsx              titulní stránka
│   ├── katalog/              prohlížení ověřených videí
│   ├── video/[youtubeId]/    detail — kdo ověřil, kdy a proč
│   ├── recenzent/[slug]/     veřejný profil recenzenta
│   ├── pro-odborniky/        jak se stát recenzentem + přihlášení
│   ├── odbornik/             za přihlášením: fronta, profil, posudky
│   ├── namitka/              námitka proti značce
│   ├── admin/
│   │   ├── prihlaseni/       heslo (mimo guard — layouty se vnořují)
│   │   └── (chraneno)/       videa, kanály, recenzenti, námitky
│   └── api/index/            index pro rozšíření
├── actions/                  Server Actions (mutace)
├── db/                       schéma a všechny dotazy
├── lib/                      session, magic link, maily, validace, obory
└── components/               sdílené UI

rozsireni/src/
├── obsah.ts                  content script — hledání videí a značky
├── pozadi.ts                 synchronizace indexu (alarms)
├── index.ts                  lokální kopie indexu a dotazy do ní
├── youtube.ts                čtení ID z href, hledání karty
├── znacka.ts                 vykreslení značky
└── popup/                    přepínače režimů a stav synchronizace
```

Pravidlo značky je v `web/src/db/queries.ts` (`prepocitejStavVidea`),
obory a stavy v `web/src/lib/obory.ts`, formát indexu v
`web/src/lib/index-dat.ts` — ten je **kontrakt s rozšířením**, při změně se
musí upravit i `rozsireni/src/index.ts`.

---

## Licence

Volně k použití a úpravám pro jakoukoli školu. Pokud to někde nasadíš
a narazíš na problém, dej vědět.
