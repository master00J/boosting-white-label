# AI-integratie op BoostPlatform

Je hebt al **helpdesk-AI** (OpenAI/Anthropic) voor ticketantwoorden. Hieronder staan extra plekken waar AI op een zinvolle manier kan worden ingezet, op volgorde van impact en haalbaarheid.

---

## 1. **Storefront: “Vind je service” / pre-sales chatbot** (hoge impact)

**Idee:** Op de homepage of bij Games een korte chat: “Wat wil je laten boosten?” → AI stelt 1–2 vragen en linkt naar het juiste game/service.

**Waarom:** Minder zoekgedrag, betere conversie, onderscheid t.o.v. concurrenten.

**Implementatie:**
- Kleine chat-widget (of inline op /how-it-works) die `getAIProvider()` gebruikt.
- System prompt: kennis van jullie games/services (namen, slugs); antwoord eindigt met één link naar `/games/{slug}` of `/games/{slug}/{cat}/{service}`.
- API-route bv. `POST /api/ai/suggest-service` (rate-limited, alleen voor ingevulde vraag).
- Geen gevoelige data in de prompt; alleen productinfo.

**Risico’s:** Hallucinaties (verkeerde link). Beperken door: korte conversatie, strikte prompt (“antwoord alleen met deze URL”), en alleen links uit een whitelist toestaan.

---

## 2. **Review-samenvatting per service/booster** (hoge impact, SEO)

**Idee:** Per service- of boosterpagina: “Klanten zeggen: snel, professioneel, goede communicatie” – 1–2 zinnen gegenereerd uit recente reviews.

**Waarom:** Betrouwbaarheid, sneller scannen, mogelijk rich snippets.

**Implementatie:**
- Bij het tonen van een service (of booster): laatste N openbare reviews ophalen.
- Als er ≥3 reviews zijn: `generateReviewSummary(reviews)` aanroepen (nieuwe functie in `lib/ai/`).
- Resultaat cacheën (bv. in `site_settings` of een `service_meta`-tabel) en 1× per dag of bij nieuwe review verversen.
- System prompt: “Summarise in 1–2 short sentences in the same language as the reviews. Only use themes that appear in the reviews. Output in Dutch or English.”

**Risico’s:** Lage. Geen PII in de prompt; alleen reviewtekst. Bij geen/weinig reviews: geen AI-blok tonen.

---

## 3. **Semantisch zoeken** (medium impact)

**Idee:** Naast “naam bevat X” ook zoeken op intentie, bv. “level mijn character snel” → relevante services.

**Implementatie:**
- Optie A: Embeddings (OpenAI/Cohere) van service-namen + beschrijvingen; zoekquery embedden; similarity search (bv. pgvector in Supabase).
- Optie B: Eerst alleen “query expansion”: AI maakt van de zoekterm 3–5 synoniemen/keywords; zoek met `OR` op die termen. Geen embeddings nodig.

B is sneller te bouwen; A schaalbaar en sterker op lange termijn.

---

## 4. **Aanbevelingen (“Klanten zoals jij bestelden ook”)** (medium impact)

**Idee:** Op cart/checkout of servicepagina: “Anderen bestelden ook: [service B]”.

**Implementatie:**
- Simpele variant: co-occurrence (zelfde orders ofzelfde gebruikers). Geen AI.
- AI-variant: “Waarom past dit bij jou?” – korte zin gegenereerd op basis van huidige cart + aanbevolen service (productnamen, categorieën). Gebruik bestaande `getAIProvider()` en korte prompt.

---

## 5. **Helpdesk uitbreiden** (je hebt al de basis)

- **Suggestie voor agent:** Bij open ticket toont een knop “AI-suggestie”: zelfde `generateHelpdeskResponse()` aanroepen en voorstel tonen zonder te posten; agent kan bewerken en dan verzenden.
- **Categorisatie:** Nieuw ticket → AI stelt category voor (Betaling / Order / Technisch / Overig). Optioneel: prioriteit.
- **Sentiment:** AI geeft een simpele score (neutraal/negatief/urgent); handig voor triage.

Alles via bestaande `lib/ai` en `/api/helpdesk/ai`-achtige routes.

---

## 6. **Order-ETA (experimenteel)** (lage prioriteit)

**Idee:** “Geschatte afronding: over ~8 uur” op basis van vergelijkbare orders (game, service, moment).

**Implementatie:** Eerst regelmatie uit historische data (gemiddelde doorlooptijd per service/game). AI alleen eventueel voor vrije-tekst-uitleg (“Door drukte kan het iets langer duren”).

---

## Wat niet doen (zonder extra laag)

- Geen gevoelige data (inloggegevens, betaalgegevens, credentials) in prompts.
- Geen volledig geautomatiseerde beslissingen over refunds/claims; altijd “AI suggereert, mens beslist”.
- Geen AI-output direct als waarheid tonen zonder review (bv. juridische/medische teksten).

---

## Technische afspraken

- **Provider:** Blijf `getAIProvider()` uit `lib/ai` gebruiken; alle nieuwe features gebruiken dezelfde API key(s) uit Admin → Helpdesk/Settings.
- **Rate limiting:** Nieuwe AI-endpoints (storefront, suggest-service, review-summary) rate-limiten per IP en per user.
- **Logging:** Optioneel: log geen volledige prompts, wel type actie (helpdesk, suggest-service, review-summary) en eventueel token-usage voor kostenbewustzijn.
- **Fallback:** Als `getAIProvider()` null geeft (geen key), gracefully degraderen: geen AI-blokken, rest van de app werkt normaal.

---

## Aanbevolen eerste stap

**Review-samenvatting (punt 2)** is een sterke eerste uitbreiding: hergebruik van bestaande AI-setup, duidelijke meerwaarde voor trust en SEO, geen PII, eenvoudig te cachen. Daarna kun je de storefront-chat (punt 1) of helpdesk-uitbreidingen (punt 5) doen.

Als je wilt, kan de volgende stap zijn: concreet ontwerp (welke velden, welke API, welke prompt) of een minimale implementatie van de review-samenvatting in deze repo.
