# Školní IT helpdesk

Ticket systém pro jednoho správce IT na škole. Kolegové nahlásí závadu,
ty máš v jednom seznamu, co je potřeba udělat, a druhý seznam toho, co už
jsi udělal — použitelný jako podklad pro ředitele nebo jako výkaz práce.

**Žádné zakládání účtů a žádná hesla pro kolegy.** Kdo chce nahlásit závadu,
zadá svůj školní e-mail, přijde mu odkaz a kliknutím je přihlášený na 90 dní.
Zároveň to je ochrana proti spamu: bez funkční adresy na povolené školní
doméně tiket nevznikne.

---

## Jak to funguje

**Kolega:** zadá školní e-mail → přijde mu odkaz → klikne → vyplní závadu →
na `/moje` sleduje stav a může se ozvat. Odpověď na uzavřený tiket ho otevře
znovu.

**Ty:** `/admin` s heslem → fronta řazená podle priority a stáří → u tiketu
měníš stav, píšeš žadateli, zapisuješ interní poznámky → při uzavření vyplníš,
co jsi udělal, a kolik to zabralo → `/admin/hotovo` je archiv s exportem do CSV.

Stavy: **Nový → Řeším → Čeká (díly, servis) → Hotovo**, plus **Zamítnuto**.

E-maily se posílají jen tři: přihlašovací odkaz, upozornění tobě na nový tiket,
a žadateli zpráva, že je hotovo. Nic jiného, ať to neotravuje.

---

## Rozchození na vlastním počítači

Potřebuješ **Node.js 20.9+** a nějaký **PostgreSQL** (buď lokální, nebo rovnou
ten z Neonu — viz nasazení níže).

```bash
cd helpdesk
npm install
```

```bash
cp .env.example .env.local
```

V `.env.local` vyplň aspoň tyhle čtyři:

| Proměnná | Co tam dát |
| --- | --- |
| `DATABASE_URL` | `postgres://uzivatel@localhost:5432/helpdesk`, nebo connection string z Neonu |
| `APP_SECRET` | vygeneruj: `openssl rand -base64 48` |
| `ADMIN_PASSWORD` | tvoje heslo do `/admin` |
| `ALLOWED_EMAIL_DOMAINS` | `zsulesa.cz` |

`MAIL_DRIVER` nech na `console` — maily se nikam neodešlou, jen se vypíšou do
terminálu a uloží do `.dev-mail/last.json`. Díky tomu si projdeš i přihlášení
bez nastavování Resendu.

Vytvoř tabulky a spusť to:

```bash
npm run db:push
```

```bash
npm run dev
```

Otevři `http://localhost:3000`, zadej adresu na povolené doméně a **odkaz
najdeš v terminálu**, kde běží `npm run dev`.

---

## Nasazení na Vercel

### 1. Databáze (Neon)

Založ projekt na [neon.tech](https://neon.tech) a zkopíruj si connection
string. **Vezmi ten s `-pooler` v adrese** (v Neonu označený jako *Pooled
connection*) — bez něj by si každá serverless instance držela vlastní spojení
a databáze by je brzy začala odmítat.

### 2. Vercel

Naimportuj tenhle repozitář a **nastav Root Directory na `helpdesk`**
(Settings → General → Root Directory). Bez toho Vercel hledá aplikaci
v kořeni repozitáře a nenajde ji.

Do Environment Variables dej všechno z `.env.example`. `APP_URL` nastav na
veřejnou adresu aplikace, **bez lomítka na konci**.

Po prvním nasazení vytvoř tabulky — z vlastního počítače, s `DATABASE_URL`
nastavenou na Neon:

```bash
npm run db:push
```

### 3. E-maily (Resend)

1. Založ účet na [resend.com](https://resend.com) a přidej doménu `zsulesa.cz`.
2. Resend ti ukáže **DNS záznamy** (SPF, DKIM a návratovou cestu). Musí je
   přidat ten, kdo spravuje doménu školy — pokud to nejsi ty, pošli mu je.
3. Počkej, až je Resend ověří (většinou do hodiny).
4. Vytvoř API klíč a nastav ve Vercelu:
   - `MAIL_DRIVER=resend`
   - `RESEND_API_KEY=re_...`
   - `MAIL_FROM=Helpdesk ZŠ <helpdesk@zsulesa.cz>`
   - `ADMIN_NOTIFY_EMAIL=` tvoje adresa

> **Doména v `MAIL_FROM` musí být v Resendu ověřená.** Dokud není, Resend
> odesílání odmítne a v aplikaci uvidíš hlášku, že se odkaz nepodařilo poslat.
> Dokud DNS záznamy nemáš, nech `MAIL_DRIVER=console`.

---

## Ověření, že všechno funguje

Součástí je end-to-end test, který projde celou aplikaci v prohlížeči —
včetně věcí, které se ručně testují blbě (dvojí kliknutí na odkaz, rate limit,
že interní poznámka neprosákne k žadateli).

Při běžícím `npm run dev` a `MAIL_DRIVER=console`:

```bash
npm install -D playwright && npx playwright install chromium
```

```bash
npm run smoke
```

Test si přečte přihlašovací odkaz z `.dev-mail/last.json`, takže funguje
i bez poštovní schránky. **Pusť ho jen na vývojové databázi** — zakládá tikety
a zabere část hodinového rate limitu.

---

## Jak je to postavené

| Vrstva | Čím |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Vzhled | Tailwind CSS 4 |
| Databáze | PostgreSQL + Drizzle ORM |
| Přihlášení | vlastní, podepsaný JWT v httpOnly cookie (`jose`) |
| E-maily | Resend, nebo `console` driver pro vývoj |
| Validace | Zod |

### Pár rozhodnutí, která stojí za vysvětlení

**Proč ne NextAuth.** Umí přesně tenhle e-mailový flow, ale přitáhne adaptéry
a konfiguraci. Vlastní implementace má asi 120 řádků, je celá na očích
(`src/lib/session.ts`, `src/lib/magic-link.ts`) a snáz se v ní hrabe.

**Proč `pg` a ne `@neondatabase/serverless`.** HTTP driver Neonu neumí
transakce, jen `batch()`. S obyčejným `pg` driverem mluví stejný kód s Neonem
i s lokálním Postgresem a je k dispozici `db.transaction()` — jinak by byly
potřeba dvě verze kódu pro lokál a produkci.

**Proč jsou vypnuté Cache Components.** Každá stránka je per-user dynamická
(čte cookie a podle ní databázi), takže není co prerenderovat. Zapnuté by
znamenaly Suspense hranice okolo každé stránky za nulový přínos. Viz komentář
v `next.config.ts`.

**Proč je guard administrace v `src/app/admin/(chraneno)/`.** Layouty se
v App Routeru vnořují, nenahrazují. Kdyby guard seděl v `app/admin/layout.tsx`,
platil by i pro přihlašovací stránku a ta by přesměrovávala sama na sebe.
Název složky v závorkách se do URL nepropisuje.

### Bezpečnost

Přihlašovací formulář je jediné místo, kam může kdokoli z internetu poslat
POST a nechat aplikaci odeslat e-mail, tak je ošetřený poctivě:

- **Doména** se kontroluje přesnou shodou, ne „končí na“ — jinak by prošlo
  `zsulesa.cz.utocnik.cz`.
- **Rate limit:** 5 odkazů na adresu za hodinu, 20 z jedné IP za hodinu.
- **Token** je 32 náhodných bajtů, v databázi jen jeho SHA-256 hash,
  jednorázový, platnost 30 minut. Spotřebuje se jediným atomickým `UPDATE`,
  takže dvě souběžná kliknutí nemůžou projít obě.
- **Admin heslo** se porovnává v konstantním čase.
- **Server Actions a route handlery si ověřují přihlášení samy.** Guard
  v layoutu chrání jen zobrazení stránek — akce se dají zavolat POSTem mimo UI
  a `/admin/export` se s layoutem vůbec nerenderuje.
- **CSV export** je ošetřený proti tomu, aby se text od uživatele vyhodnotil
  v Excelu jako formule.

### Osobní údaje (GDPR)

Aplikace ukládá **jména, školní e-maily a popisy závad** — tedy osobní údaje
zaměstnanců. Z toho plyne pár praktických věcí:

- Zpracování stojí na oprávněném zájmu školy (správa majetku a IT podpora).
  Zmiň to ve školní dokumentaci ke zpracování osobních údajů.
- **Nenechávej to běžet bez konce.** Starší tikety po roce nebo dvou smaž:
  ```sql
  DELETE FROM tickets WHERE resolved_at < now() - interval '2 years';
  ```
  Historie i komentáře se smažou s nimi (cizí klíč má `ON DELETE CASCADE`).
- Když někdo požádá o smazání svých údajů:
  ```sql
  DELETE FROM tickets WHERE requester_email = 'jmeno@zsulesa.cz';
  ```
- CSV export obsahuje jména i adresy. Neposílej ho ven ze školy a nenechávej
  ho ve sdílené složce.
- Data jsou u Neonu — při zakládání projektu zvol **region v EU**
  (např. Frankfurt).

---

## Co v téhle verzi záměrně není

**Fotka k tiketu.** U „nefunguje tiskárna“ by hodně pomohla, ale vyžaduje
další službu (Vercel Blob) a další konfiguraci při nasazení. Schéma i formulář
jsou navržené tak, aby to šlo doplnit jedním sloupcem a jedním polem,
ne přestavbou.

Dál se nabízí: QR kódy po třídách s předvyplněnou místností, opakující se
úkoly (revize, zálohy), evidence techniky.

---

## Struktura

```
src/
├── app/
│   ├── page.tsx                  zadání školního e-mailu
│   ├── prihlaseni/potvrdit/      cíl odkazu z e-mailu (GET handler)
│   ├── nahlasit/                 formulář závady
│   ├── moje/                     pohled žadatele
│   └── admin/
│       ├── prihlaseni/           heslo (mimo guard — viz výše)
│       ├── (chraneno)/           fronta, detail, archiv — za guardem
│       └── export/route.ts       CSV
├── actions/                      Server Actions (mutace)
├── db/                           schéma a všechny dotazy
├── lib/                          session, magic link, maily, validace
└── components/                   sdílené UI
```

Všechny SQL dotazy jsou v `src/db/queries.ts`, všechny texty stavů
a kategorií v `src/lib/statuses.ts` — když se mají přejmenovat kategorie
nebo přidat stav, je to na jednom místě.
