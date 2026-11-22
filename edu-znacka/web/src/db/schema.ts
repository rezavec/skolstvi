import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Recenzenti — ověření odborníci, kteří udělují značku.
 *
 * Jméno, titul, instituce a obory jsou **veřejné**. V tom je celá hodnota
 * značky: kdo jí nevěří, může si přečíst, kdo ji dal a čím se zabývá.
 * E-mail veřejný není nikdy.
 *
 * Ověření, že je recenzent skutečně odborník, stojí na třech vrstvách
 * (žádná sama nestačí): adresa na akademické doméně → ruční schválení
 * správcem, který dohledá profil na stránkách instituce → veřejná
 * dohledatelnost všeho, co kdy podepsal.
 */
export const recenzenti = pgTable(
  "recenzenti",
  {
    id: serial("id").primaryKey(),

    /** Do URL veřejného profilu: `jan-novak`, při kolizi `jan-novak-2`. */
    slug: varchar("slug", { length: 80 }).notNull().unique(),

    // ověřený magic linkem, takže se mu dá věřit — ale nezveřejňuje se
    email: text("email").notNull().unique(),

    jmeno: text("jmeno").notNull(),
    /** „doc. RNDr.“ apod. Nepovinné — ne každý odborník má titul v názvu. */
    titul: text("titul"),
    instituce: text("instituce").notNull(),

    /** ORCID iD ve tvaru 0000-0002-1825-0097. Nepovinné, zveřejňuje se. */
    orcid: varchar("orcid", { length: 19 }),
    /** Odkaz na profil na stránkách instituce — podklad pro schválení. */
    profilUrl: text("profil_url"),

    /**
     * Obory, ve kterých smí recenzovat (slugy z lib/obory.ts).
     *
     * Recenze se počítá jen tehdy, když je obor videa mezi nimi — fyzik
     * nedává značku videu o dědičnosti.
     */
    obory: text("obory").array().notNull(),

    // ceka | schvalen | zamitnut | pozastaven
    stav: text("stav").notNull().default("ceka"),
    /** Proč byl zamítnut nebo pozastaven. Vidí ho i on sám. */
    duvod: text("duvod"),

    /** Souhlas se zveřejněním jména, titulu a instituce. Bez něj to nejde. */
    souhlasZverejneni: timestamp("souhlas_zverejneni", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    schvalenoAt: timestamp("schvaleno_at", { withTimezone: true }),
  },
  (t) => [
    index("recenzenti_stav_idx").on(t.stav),
    index("recenzenti_created_at_idx").on(t.createdAt),
  ],
);

/**
 * Kanály s plošnou důvěrou — slabší značka „důvěryhodný kanál“.
 *
 * Uděluje ji správce, ne recenzent, a znamená něco jiného než značka
 * u videa: „kanál dlouhodobě drží úroveň“, ne „tohle video někdo přečetl“.
 * Proto v rozšíření vypadá jinak a striktní filtr ji nebere. Bez ní by byl
 * ale index první měsíce skoro prázdný.
 *
 * `prezdivka` je tu kvůli jedné nepříjemnosti: náhled videa ve feedu často
 * neobsahuje ID kanálu, jen odkaz `/@nazev`. Bez téhle dvojice by značka
 * kanálu ve feedu nefungovala.
 */
export const kanaly = pgTable(
  "kanaly",
  {
    id: serial("id").primaryKey(),

    /** ID kanálu z YouTube, vždy `UC…`. */
    youtubeId: varchar("youtube_id", { length: 32 }).notNull().unique(),
    /** Handle včetně zavináče: `@kurzgesagt`. Nepovinné. */
    prezdivka: varchar("prezdivka", { length: 64 }),

    nazev: text("nazev").notNull(),
    obor: text("obor").notNull(),

    // ceka | overeno | pozastaveno
    stav: text("stav").notNull().default("ceka"),
    /** Proč správce kanálu věří — podklad pro veřejný výpis. */
    poznamka: text("poznamka"),

    /** Viz komentář u `videa.verze`. */
    verze: integer("verze").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("kanaly_stav_idx").on(t.stav),
    index("kanaly_verze_idx").on(t.verze),
    uniqueIndex("kanaly_prezdivka_idx").on(t.prezdivka),
  ],
);

/**
 * Videa — jeden řádek = jedno video, u kterého se o značce rozhoduje.
 *
 * Do indexu a na veřejnost se dostane jen `stav = 'overeno'`. Stav
 * `odmitnuto` znamená, že recenzent video přečetl a značku nedal; takové
 * video se **nikde nezveřejňuje**, ani jako „neprošlo“ (viz lib/obory.ts).
 */
export const videa = pgTable(
  "videa",
  {
    id: serial("id").primaryKey(),

    /** ID z YouTube, vždy 11 znaků. */
    youtubeId: varchar("youtube_id", { length: 11 }).notNull().unique(),

    nazev: text("nazev").notNull(),
    /** Délka v sekundách, pokud je známá. Jen pro výpis v katalogu. */
    delkaSekund: integer("delka_sekund"),

    kanalId: integer("kanal_id").references(() => kanaly.id, {
      onDelete: "set null",
    }),
    /** Název kanálu i tehdy, když kanál sám v tabulce `kanaly` není. */
    kanalNazev: text("kanal_nazev"),

    /**
     * Jeden hlavní obor, ne seznam.
     *
     * Video o klimatu se dá zařadit pod geologii i chemii, ale značka
     * ukazuje jeden obor a recenzent je z jednoho oboru — seznam by jen
     * rozmazal, kdo za co ručí.
     */
    obor: text("obor").notNull(),
    uroven: text("uroven").notNull().default("vse"),

    // ceka | overeno | pozastaveno | odmitnuto
    stav: text("stav").notNull().default("ceka"),

    /**
     * Verze pro přírůstkovou synchronizaci rozšíření.
     *
     * Každý zápis, který může změnit obsah indexu, sem uloží další hodnotu
     * z čítače (viz `citacVerze` a `lib/verze.ts`). Diff od verze N je pak
     * jen `WHERE verze > N` — bez tabulky hrobečků.
     *
     * Nic se nemaže natvrdo: odebrání značky je změna `stav`, takže se
     * v diffu objeví a rozšíření si záznam smaže samo.
     */
    verze: integer("verze").notNull().default(0),

    /** Kdo video navrhl: `admin`, nebo e-mail recenzenta. Neveřejné. */
    pridal: text("pridal").notNull().default("admin"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Kdy značka vznikla. Zobrazuje se — značka je snímek v čase. */
    overenoAt: timestamp("overeno_at", { withTimezone: true }),

    /**
     * Kdy správce značku odebral po vyhovění námitce.
     *
     * Musí to být vlastní sloupec, ne jen stav: stav se přepočítává
     * z recenzí (`prepocitejStavVidea`), takže kdyby tu tenhle záznam
     * nebyl, kladná recenze by značku po vyřízení námitky okamžitě
     * vrátila a námitka by neměla žádný trvalý efekt.
     *
     * Zruší se jedině ručně v administraci (typicky až po nové recenzi).
     */
    znackaOdebranaAt: timestamp("znacka_odebrana_at", { withTimezone: true }),
    /** Kdy se naposled ověřilo, že video na YouTube pořád existuje. */
    zkontrolovanoAt: timestamp("zkontrolovano_at", { withTimezone: true }),
  },
  (t) => [
    index("videa_stav_idx").on(t.stav),
    index("videa_verze_idx").on(t.verze),
    index("videa_obor_idx").on(t.obor),
    index("videa_overeno_at_idx").on(t.overenoAt),
  ],
);

/**
 * Recenze — podepsané posouzení jednoho videa jedním recenzentem.
 *
 * `verdikt = 'neodpovida'` se **nikdy nezveřejňuje.** Ukládá se jen proto,
 * aby druhý recenzent nedělal stejnou práci dvakrát a aby ho správce viděl
 * v administraci. Veřejně vystavené „tohle video je špatně“ u jmenovaného
 * autora je zásah do jeho dobré pověsti a musel by se umět obhájit.
 */
export const recenze = pgTable(
  "recenze",
  {
    id: serial("id").primaryKey(),

    videoId: integer("video_id")
      .notNull()
      .references(() => videa.id, { onDelete: "cascade" }),
    recenzentId: integer("recenzent_id")
      .notNull()
      .references(() => recenzenti.id, { onDelete: "cascade" }),

    // odpovida | neodpovida
    verdikt: text("verdikt").notNull(),
    /** Obor, ze kterého recenzent mluví — musí být mezi jeho obory. */
    obor: text("obor").notNull(),

    /** Zdůvodnění. Povinné u obou verdiktů. */
    zduvodneni: text("zduvodneni").notNull(),
    /** Zdroje, ideálně odkazy na literaturu. Nepovinné. */
    zdroje: text("zdroje"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("recenze_video_id_idx").on(t.videoId),
    index("recenze_recenzent_id_idx").on(t.recenzentId),
    // jeden recenzent = jedna recenze k videu (opravit se dá, přidat ne)
    uniqueIndex("recenze_video_recenzent_idx").on(t.videoId, t.recenzentId),
  ],
);

/**
 * Námitky proti udělené značce.
 *
 * Povinná cesta zpět: kdo nesouhlasí se značkou u videa — včetně jeho
 * autora — to napíše a značka se do vyřízení pozastaví. Bez téhle cesty by
 * byla značka nevyvratitelná, a to si u tvrzení o vědeckém konsenzu nemůže
 * dovolit nikdo.
 *
 * Kontakt na autora námitky se nezveřejňuje.
 */
export const namitky = pgTable(
  "namitky",
  {
    id: serial("id").primaryKey(),

    videoId: integer("video_id")
      .notNull()
      .references(() => videa.id, { onDelete: "cascade" }),

    /** E-mail nebo jiný kontakt. Neveřejné. */
    kontakt: text("kontakt").notNull(),
    /** Hlásí se autor videa? Mění to prioritu vyřízení. */
    jeAutor: text("je_autor").notNull().default("ne"),
    text: text("text").notNull(),

    // nova | vyresena | zamitnuta
    stav: text("stav").notNull().default("nova"),
    /** Jak byla vyřízena. U zamítnuté je to odpověď namítajícímu. */
    vyrizeni: text("vyrizeni"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    vyrizenoAt: timestamp("vyrizeno_at", { withTimezone: true }),
  },
  (t) => [
    index("namitky_video_id_idx").on(t.videoId),
    index("namitky_stav_idx").on(t.stav),
  ],
);

/**
 * Jednorázové přihlašovací tokeny (magic link) pro recenzenty.
 *
 * V databázi je jen SHA-256 hash tokenu, nikdy token sám — kdyby někdo
 * získal přístup k DB, nemůže se s jejím obsahem přihlásit.
 *
 * Tabulka slouží zároveň jako záznam pro rate limit (viz lib/rate-limit.ts),
 * proto se tu ukládá i IP a čas vytvoření.
 */
export const magicTokens = pgTable(
  "magic_tokens",
  {
    id: serial("id").primaryKey(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    email: text("email").notNull(),
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
  },
  (t) => [
    index("magic_tokens_email_created_at_idx").on(t.email, t.createdAt),
    index("magic_tokens_ip_created_at_idx").on(t.ip, t.createdAt),
  ],
);

/**
 * Čítač verzí indexu. Jediný řádek (`id = 1`).
 *
 * Proč tabulka a ne Postgres sekvence: `UPDATE … RETURNING` drží na řádku
 * zámek až do commitu, takže se verze přidělují **v pořadí commitů**.
 * U sekvence (ani u `now()`) to neplatí — transakce, která si vzala verzi
 * dřív, může commitnout později, a rozšíření by si při synchronizaci
 * přesně na té hranici záznam přeskočilo a nikdy se k němu nevrátilo.
 *
 * Zápisy jsou vzácné (správce přidává videa, recenzent píše recenze),
 * takže to, že se tím serializují, nikomu nevadí.
 */
export const citacVerze = pgTable("citac_verze", {
  id: integer("id").primaryKey().default(1),
  hodnota: integer("hodnota").notNull().default(0),
});

export type Recenzent = typeof recenzenti.$inferSelect;
export type NovyRecenzent = typeof recenzenti.$inferInsert;
export type Kanal = typeof kanaly.$inferSelect;
export type Video = typeof videa.$inferSelect;
export type NoveVideo = typeof videa.$inferInsert;
export type Recenze = typeof recenze.$inferSelect;
export type Namitka = typeof namitky.$inferSelect;
