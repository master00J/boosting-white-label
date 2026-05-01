# Plan: AI Order from Text + OSRS-kennis

**Doel:** Een klant beschrijft in gewone taal wat hij wil (bijv. “Dragon Slayer 2 account from scratch” of “1–99 fishing met barbarian”). De AI begrijpt dit, heeft kennis van het platform én van OSRS (quests, skill- en quest-requirements, efficiënte build-paden), en stelt een concrete order(s) voor tot aan de betaalsectie.

---

## 1. Scope en doelen

| Doel | Beschrijving |
|------|--------------|
| **Order from text** | Vrije-tekstinput → AI mapt naar bestaande games/services + configuratie (levels, methodes, quests, etc.) → systeem bouwt cart/order tot aan betalen. |
| **OSRS-kennis** | AI kent quest- en skill-requirements (bijv. DS2: welke quests en levels nodig), en kan een **efficiënte build** voorstellen (volgorde van quests/skills, eventueel meerdere services in één “build”). |
| **Eén plek tot betalen** | Klant komt uiteindelijk op de bestaande checkout met vooringevulde items; betaling verloopt zoals nu (Stripe/PayPal/balance). |

**Niet in scope (voor dit plan):** Automatisch betalen via AI; wijzigingen aan de payment flow zelf; andere games dan OSRS (later uitbreidbaar).

---

## 2. Welke kennis heeft de AI nodig?

### 2.1 Platform/catalogus

- **Games:** id, name, slug (bijv. `oldschool-runescape`).
- **Categories per game:** id, name, slug (bijv. `powerleveling`, `questing`).
- **Services per category:** id, name, slug, `pricing_type`, `price_matrix`, `form_config` (velden die de klant invult).
- **Pricing types:** `xp_based`, `per_item`, `per_unit`, `stat_based`, `per_item_stat_based`, `boss_tiered`.
- Per type: welke velden/opties bestaan (skills, level ranges, methods, quests, items, stats, etc.).

Deze data kan de AI krijgen via:
- **Optie A:** Bij elke request een **catalogus-snapshot** meesturen (JSON) met actieve games/services en hun schema’s (beperkt tot wat nodig is voor matching).
- **Optie B:** Catalogus periodiek exporteren naar een **knowledge base** (bestand of DB) en die in de system prompt of via RAG injecteren. Bij wijzigingen in catalog opnieuw exporteren.

Aanbeveling: start met **Optie A** (snapshot per request) voor correctheid; later eventueel B voor kleinere prompts.

### 2.2 OSRS-domeinkennis

Voor “DS2 from scratch” en efficiënte builds moet de AI weten:

| Soort | Voorbeelden | Bron |
|-------|-------------|------|
| **Quest-requirements** | DS2 vereist: Legend’s Quest, 200 QP, 75 Magic, 70 Smithing, 62 Mining, 60 Crafting, 50 Construction, 48 Agility, … | OSRS Wiki / eigen dataset |
| **Quest-prerequisites** | Welke quests moeten eerst (dependency graph). | Zelfde bron |
| **Skill-requirements per quest** | Per quest: minimale levels (Attack, Strength, Agility, …). | Zelfde bron |
| **Efficiënte volgorde** | Optimale volgorde van quests/skills voor “DS2 from scratch” (min tijd of min XP waste). | Afgeleid uit requirements + eventueel bekende guides |

**Bestaande data in het platform:**

- `game_quests`: id, name, slug, difficulty, length, quest_points, series, is_members, sort_order.
- `game_quest_required_items`: items die de klant nodig heeft voor een quest (voor item-lijst, niet voor skill/quest-prereqs).

**Ontbrekend (moet worden toegevoegd of gekoppeld):**

- **Quest prerequisites:** per quest, lijst van vereiste quests (of quest IDs) en vereiste skill-levels.
- **Efficiënte build-logica:** kan deels door de AI gedaan worden als we een gestructureerd overzicht van requirements geven; anders een eenvoudige “build order”-dataset of regels.

**Mogelijke bronnen voor OSRS-data:**

1. **Handmatig:** Curated JSON/TS bestand (bijv. `lib/osrs-quest-requirements.ts`) met per quest: `requiredQuests`, `requiredSkills`, `questPoints`. Onderhoud bij game updates.
2. **Wiki:** OSRS Wiki heeft gestructureerde data (o.a. Infobox). Een eenmalige of periodieke scrape/import naar een tabel `game_quest_requirements` (quest_id, type: 'quest'|'skill', requirement_id of name, value).
3. **Hybride:** Kernquests (DS2, SOTE, etc.) handmatig onderhouden; rest optioneel later uit wiki.

Aanbeveling: **Fase 1** een **statische dataset** voor de belangrijkste goals (o.a. DS2, Quest cape, Fire cape, Inferno). In **Fase 2** uitbreiden met meer quests en eventueel wiki-import.

---

## 3. Architectuur

### 3.1 High-level flow

```
[Klant]  "Ik wil een Dragon Slayer 2 account from scratch"
    → [Storefront]  Tekst naar API
    → [API]  Catalogus + OSRS-knowledge ophalen
    → [AI]  Intent + structured output: build (meerdere stappen) of één order
    → [API]  Valideer tegen catalogus, bereken prijzen (bestaande pricing-engine)
    → [API]  Return: cart payload OF deep links naar service-pagina’s met prefill
    → [Frontend]  Toon samenvatting + “Ga naar betalen” of “Bekijk build”
```

### 3.2 Nieuwe onderdelen

| Onderdeel | Doel |
|-----------|------|
| **OSRS knowledge base** | Bestand(en) of tabel met quest requirements + optioneel “efficient build”-regels. |
| **Catalog snapshot builder** | Functie die actieve games/services + form_config/price_matrix (alleen schema, geen gevoelige data) naar een compact JSON voor de AI exporteert. |
| **API: POST /api/order-from-description** | Accepteert `{ "description": "..." }`. Roept AI aan met catalog + OSRS context. Verwacht **structured output** (JSON). Valideert en berekent prijs. Retourneert `{ items: CheckoutItem[], summary, buildSteps? }` of `{ clarification: string }`. |
| **AI-agent: order-from-description** | System prompt + catalog + OSRS data. Output-schema: bijv. `{ type: "single" | "build", items: [...], buildSteps?: [...], clarification?: string }`. |
| **Frontend: “Beschrijf je order”** | Input + knop op storefront (of in chat-widget). Na response: redirect naar checkout met items, of toon build-stappen met “Voeg toe aan cart” per stap. |

### 3.3 Structured output (AI)

De AI moet **geen vrije tekst** teruggeven die we moeten parsen, maar **vast JSON-schema**. Bijvoorbeeld:

```ts
// Enkele order
{
  "type": "single",
  "items": [
    {
      "gameSlug": "oldschool-runescape",
      "serviceSlug": "fishing-powerleveling",
      "configuration": {
        "skill_fishing": { "startLevel": 1, "endLevel": 99 },
        "method": "barbarian_fishing"
      }
    }
  ],
  "clarification": null
}

// Build (meerdere stappen, bijv. DS2 from scratch)
{
  "type": "build",
  "buildName": "Dragon Slayer 2 from scratch",
  "buildSteps": [
    { "label": "Quests & skills for DS2", "items": [ ... ] },
    { "label": "Dragon Slayer 2", "items": [ ... ] }
  ],
  "items": [ /* alle items van alle stappen, voor één cart */ ],
  "clarification": null
}

// Onduidelijk
{
  "type": "clarification",
  "items": [],
  "clarification": "Welke game bedoel je: OSRS of RS3?"
}
```

De backend mapt `gameSlug`/`serviceSlug` naar echte `gameId`/`serviceId`, valideert `configuration` tegen `form_config`, roept `calculatePrice` aan en vult `finalPrice` in. Daarna kan de bestaande checkout-payload worden opgebouwd.

### 3.4 Waar OSRS-knowledge wordt gebruikt

- In de **system prompt** (of aparte context-blok): gestructureerde lijst van o.a.:
  - Per “goal” (DS2, Quest cape, Fire cape, …): vereiste quests, vereiste skills, aanbevolen volgorde.
  - Optioneel: korte regels (“efficient path: do X quests first for QP, then train Y to Z”).
- De AI gebruikt dit om:
  - Uit “DS2 from scratch” af te leiden: welke quests en skills eerst, en welke services (quest services, skilling services) daarbij horen.
  - Een **build** met meerdere regels (meerdere services) voor te stellen, of één gecombineerde “account build”-service als die in de catalogus bestaat.

---

## 4. OSRS-dataset (quest requirements + efficient build)

### 4.1 Minimale dataset voor Fase 1

Een bestand (bijv. `src/lib/osrs-quest-requirements.ts` of JSON in `public/data/`) met:

```ts
export interface QuestRequirement {
  questSlug: string;       // of quest name
  requiredQuestSlugs: string[];
  requiredSkills: { skillId: string; minLevel: number }[];
  questPoints?: number;
}

export interface BuildGoal {
  id: string;              // "ds2", "quest_cape", "fire_cape", "inferno"
  name: string;
  questSlug?: string;      // hoofdquest indien van toepassing
  suggestedOrder: string[]; // quest slugs of goal IDs in volgorde
  notes?: string;
}

export const OSRS_QUEST_REQUIREMENTS: QuestRequirement[] = [
  {
    questSlug: "dragon_slayer_2",
    requiredQuestSlugs: ["tales_of_the_dragon", "legendary_quest", ...],
    requiredSkills: [
      { skillId: "magic", minLevel: 75 },
      { skillId: "smithing", minLevel: 70 },
      { skillId: "mining", minLevel: 62 },
      { skillId: "crafting", minLevel: 60 },
      { skillId: "construction", minLevel: 50 },
      { skillId: "agility", minLevel: 48 },
      // ...
    ],
    questPoints: 200,
  },
  // ...
];

export const OSRS_BUILD_GOALS: BuildGoal[] = [
  {
    id: "ds2",
    name: "Dragon Slayer 2 from scratch",
    questSlug: "dragon_slayer_2",
    suggestedOrder: ["qp_early", "skills_for_ds2", "dragon_slayer_2"],
    notes: "Efficient: do QP-giving quests first, then train skills, then DS2.",
  },
  // ...
];
```

De exacte DS2-requirements haal je uit de [OSRS Wiki – Dragon Slayer II](https://oldschool.runescape.wiki/w/Dragon_Slayer_II). Andere goals (Quest cape, Fire cape, Inferno) kunnen in hetzelfde formaat.

### 4.2 Koppeling met jouw catalogus

- De AI krijgt zowel `OSRS_QUEST_REQUIREMENTS` / `OSRS_BUILD_GOALS` als de **catalog snapshot**.
- In de catalog staan jouw **services** (bijv. “Dragon Slayer 2”, “Fishing 1–99”, “Quest package – DS2 prereqs”).
- De AI koppelt:
  - een “DS2 from scratch”-vraag → het goal `ds2` → `suggestedOrder` + requirements → vertaalt naar **concrete services** uit de catalog met de juiste `configuration` (quest keuze, levels, methodes).

Als je een service “Dragon Slayer 2” hebt (quest+stats), dan is de configuratie o.a. quest = DS2 + stats. Als je aparte services hebt voor skilling (1–99 Fishing, 1–70 Smithing, …), dan stelt de AI meerdere regels voor in `buildSteps`.

---

## 5. Implementatiefasen

### Fase 1 – MVP: Eén service, geen OSRS-builds

- **Doel:** “1–99 fishing barbarian” → één order tot aan betaalsectie.
- **Wat bouwen:**
  - Catalog snapshot (alleen OSRS, alleen actieve services; beperkte velden).
  - `POST /api/order-from-description` met body `{ description }`.
  - AI prompt: catalog snapshot + instructie “output alleen dit JSON-schema”.
  - Structured output (OpenAI JSON mode of function calling): één `gameSlug`, `serviceSlug`, `configuration`.
  - Backend: slug → id lookup, config validatie, `calculatePrice`, response met checkout-achtige items.
  - Frontend: simpel invoerveld + “Order voorbereiden” → toon samenvatting + knop “Naar checkout” (cart vullen + redirect).
- **Geen:** Quest-requirements, builds, meerdere items.

### Fase 2 – OSRS-requirements + “efficient build” als voorstel

- **Doel:** “Dragon Slayer 2 account from scratch” → AI stelt een build voor (meerdere stappen/services) op basis van OSRS-knowledge.
- **Wat bouwen:**
  - Dataset `OSRS_QUEST_REQUIREMENTS` + `OSRS_BUILD_GOALS` (minimaal DS2, eventueel Quest cape / Fire cape).
  - Uitbreiding AI prompt: deze dataset + uitleg “gebruik dit om builds voor te stellen”.
  - Structured output uitbreiden: `type: "build"`, `buildSteps`, `items` (alle items voor de cart).
  - Backend: meerdere items accepteren, elk valideren en prijzen, één response met alle items.
  - Frontend: toon build-stappen (naam + prijs per stap) + totaal + “Alles toevoegen en naar checkout”.
- **Niet in Fase 2:** Automatische “optimale” volgorde berekenen (die volgorde komt uit de dataset of uit de AI-suggestie).

### Fase 3 – Uitbreiding en robuustheid

- Meer goals (Inferno, SOTE, Quest cape, …) en meer quests in de dataset.
- Optioneel: wiki-scraper of handmatige updates voor `game_quest_requirements` in de DB.
- Chat-achtige flow: meerdere vragen van de AI (“Welke methode wil je voor Fishing: barbarian of 3-tick?”) voordat de order wordt opgebouwd.
- Rate limiting, logging, fallback als AI geen geldige structuur teruggeeft.

---

## 6. Technische details

### 6.1 Catalog snapshot

- **Bron:** Supabase: `games` (active), `categories`, `services` (active), met `price_matrix` en `form_config`.
- **Vereenvoudiging:** Alleen velden die nodig zijn voor matching en configuratie (geen interne IDs in de prompt als het niet hoeft; wel slugs). Bijvoorbeeld per service: name, slug, categorySlug, gameSlug, pricing_type, lijst van velden (id, type, options/skills).
- **Grootte:** Beperk tot ~50–100 services of alleen OSRS; anders prompt wordt te groot. Bij veel services: alleen “featured” of “meest besteld” meenemen, of RAG op service-beschrijvingen.

### 6.2 Prijsberekening

- Bestaande `calculatePrice(priceMatrix, formConfig, selections)` uit `lib/pricing-engine.ts` gebruiken.
- AI levert `configuration` (key-value). Backend mapt die op `form_config` velden en roept `calculatePrice` aan. Als de combinatie ongeldig is: 400 of “kon niet berekenen, probeer op de servicepagina”.

### 6.3 Checkout-payload

- Zelfde structuur als nu in `POST /api/checkout`: `items: [{ serviceId, serviceName, gameName, gameId, quantity, finalPrice, configuration }]`.
- Frontend kan deze items in de cart store (bijv. cart-store) en doorsturen naar de bestaande checkout-pagina.

### 6.4 Beveiliging en limieten

- **Rate limit** op `POST /api/order-from-description` (per IP en per user).
- **Geen** gevoelige klantdata in de prompt; alleen catalog + OSRS-data + de door de klant ingevoerde beschrijving.
- **Validatie:** Alle serviceIds en configuraties server-side controleren; nooit AI-output direct als waarheid naar checkout sturen zonder validatie en prijsberekening.

---

## 7. Samenvatting

| Onderdeel | Actie |
|-----------|--------|
| **Order from text** | API + AI met structured output + catalog snapshot; frontend “Beschrijf je order” → cart vullen → checkout. |
| **OSRS-kennis** | Statische dataset met quest-requirements en build-goals (DS2, Quest cape, etc.); in AI-prompt of aparte context. |
| **Efficient build** | AI stelt op basis van die dataset een volgorde van quests/skills en bijbehorende services voor; gebruiker ziet build-stappen en kan alles in één keer tot aan de betaalsectie toevoegen. |

**Eerste stap:** Fase 1 (één service, simpele zin) implementeren en testen. Daarna Fase 2 met OSRS-dataset en “DS2 from scratch”-achtige builds.

Als je wilt, kan de volgende stap zijn: concreet API-contract (request/response), exact JSON-schema voor de AI, en een voorbeeld-invulling van `OSRS_QUEST_REQUIREMENTS` voor Dragon Slayer II.
