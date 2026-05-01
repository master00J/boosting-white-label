# Verbeteringen bestelproces en configuratoren

Dit document beschrijft concrete verbeteringen voor het **bestelproces** (configurator → winkelwagen → checkout) en de **service-configuratoren** die klanten gebruiken. De huidige configurator is krachtig (XP-based, stat-based, boss_tiered, loadouts, etc.) maar kan voor gebruikers overweldigend of onduidelijk zijn.

---

## 1. Configurator – UX en structuur

### 1.1 Stappen / progressive disclosure
**Probleem:** Alles staat op één lange pagina. Bij complexe services (meerdere skills, route segments, modifiers, gear) zie je in één keer veel velden.

**Verbetering:**
- **Stap-voor-stap flow** (alleen voor complexe pricing types):
  - Stap 1: "Wat wil je?" (skill kiezen OF boss/item kiezen)
  - Stap 2: "Hoeveel?" (levels/segments, kills, quantity)
  - Stap 3: "Opties" (modifiers, checkboxes, tekst)
  - Stap 4: (indien combat) "Account/gear" – optioneel
  - Stap 5: Samenvatting + prijs + Add to cart
- Elke stap toont alleen de relevante velden; onderaan "Volgende" / "Terug".
- Eenvoudige services (één dropdown + quantity) blijven één scherm.

**Implementatie:** Een wrapper-component die `formConfig.pricing_type` en aantal velden checkt; bij "complex" een `ConfiguratorSteps` met state `step` en per step een subset van de huidige configurator-UI renderen.

### 1.2 Presets / aanbevolen configuraties
**Probleem:** Nieuwe klanten weten niet wat "normaal" is (bijv. 1–70 Attack, 100 kills).

**Verbetering:**
- Admin kan per service **presets** definiëren (bijv. "Popular: 1–70 Strength", "Max: 1–99").
- Op de configurator: bovenaan of in een tab "Aanbevolen" met 2–3 knoppen; klik vult alle velden en toont direct de prijs.
- Optioneel: "Meest besteld" uit echte orderdata (wel privacy-proof: alleen geaggregeerde ranges/opties).

**Implementatie:** In `form_config` of `price_matrix` een optioneel veld `presets: Array<{ id, label, selections }>`. Configurator leest dit en toont knoppen; bij klik `setSelections(preset.selections)`.

### 1.3 Prijsopbouw duidelijker
**Probleem:** Je toont al een totaal; de oorzaak (base + modifiers + gear) is niet altijd zichtbaar.

**Verbetering:**
- **Uitklapbare "Prijsopbouw"**: Base price, per modifier (+€X of ×Y), eventueel gear discount, = totaal.
- Bij XP-based: "X segments · Y XP total = €Z" al zichtbaar; daaronder een regel per segment (optioneel).
- Bij boss_tiered: je hebt al `bossPricingInsights` – die zichtbaar maken in een compact blok naast de CTA.

**Implementatie:** `breakdown` uit de pricing-engine heeft al veel info. Een klein component `PriceBreakdown({ breakdown, priceMatrix })` dat in de sidebar onder de prijs staat, standaard ingeklapt ("Toon opbouw").

### 1.4 Validatie en foutfeedback
**Probleem:** "Add to cart" is disabled als `!isValid`; de gebruiker ziet niet *welk* veld ontbreekt of ongeldig is.

**Verbetering:**
- Bij klik op "Add to cart" / "Order now" terwijl `!isValid`: **scroll naar het eerste ontbrekende/ongeldige veld** en toon een korte inline melding ("Kies een skill" / "Vul verplichte velden in").
- Optioneel: required velden visueel markeren (rand of label) als de gebruiker al eens op Add to cart heeft geklikt.

**Implementatie:** `isValid` is al een useMemo; voeg een `invalidReasons: string[]` of `firstInvalidFieldId: string | null` toe. Bij submit: `scrollIntoView` op dat veld + toast of inline message.

---

## 2. Winkelwagen

### 2.1 Configuratiesamenvatting per regel
**Probleem:** In de cart zie je alleen "Service name", "€X" en quantity. Niet wat je hebt gekozen (bijv. "1–70 Attack, 3 segments").

**Verbetering:**
- Per cart item een **korte samenvatting** van de configuratie:
  - XP-based: "Skill · 1→70 (3 segments)"
  - Boss: "Boss X · 100 kills"
  - Per unit: "Quantity: 5"
  - Modifiers: "Optie A, Optie B" (eerste regel)
- Dit kan uit `item.configuration` worden afgeleid; een helper `formatConfigurationSummary(config, priceMatrixType)` in de frontend.

**Implementatie:** Cart item heeft al `configuration`. Op de cart-pagina (en in de cart-drawer) naast de service naam een `<p className="text-xs text-muted">${formatConfigurationSummary(item.configuration, ...)}</p>`. De cart-store hoeft niet te veranderen; alleen de weergave.

### 2.2 Bewerken vanuit de winkelwagen
**Probleem:** Om iets aan te passen moet de klant het item verwijderen, terug naar de service, opnieuw configureren en opnieuw toevoegen.

**Verbetering:**
- Per cart regel een link **"Bewerken"** → gaat naar de servicepagina met **query params** (bijv. `?cart=<cartItemId>`).
- Op de servicepagina: als `cart=<id>` en dat item staat in de cart, **pre-fill de configurator** met `item.configuration` en toon een banner "Je bewerkt dit winkelwagen-item. Opslaan vervangt het item."
- Bij "Add to cart" of "Update in cart": item met dat `id` updaten in plaats van nieuw toevoegen.

**Implementatie:** Cart item `id` is nu `${service.id}-${skill}-${Date.now()}`. Voor "edit" kun je een stabiele edit-id meenemen (bijv. index in cart of een uuid die je in een `editId` veld opslaat). Servicepagina leest `searchParams.cart` of `searchParams.edit`; als die gezet is, laad je het bijbehorende item uit de store en zet je `selections` en bij "Add to cart" roep je `updateCartItem(id, newItem)` in plaats van `addItem`. Vereist kleine uitbreiding cart-store: `updateItem(id, partialItem)` of `replaceItem(oldId, newItem)`.

### 2.3 Zelfde configuratie samenvoegen (optioneel)
**Probleem:** Nu is elke "Add to cart" een aparte regel (omdat de cart item id een timestamp heeft). Twee keer dezelfde config toevoegen geeft twee regels.

**Verbetering:** Als de gebruiker exact dezelfde service + configuration nog eens toevoegt, **quantity +1** in plaats van een nieuwe regel. Dit vereist dat "zelfde config" herkend wordt: bv. een deterministische id op basis van `serviceId + JSON.stringify(sorted configuration)` of de bestaande merge-logica in addItem uitbreiden (nu merge je alleen op `item.id`; je zou kunnen mergen op `serviceId + hash(configuration)`).

**Implementatie:** In `buildCartItem()` een `configHash` of `mergeKey` berekenen. In `addItem`: als er al een item is met dezelfde `mergeKey`, dan `updateQuantity` op dat item. Let op: quantity is nu "aantal van deze orderregel"; bij per_unit services is dat logisch, bij XP-based is "quantity 2" = twee keer dezelfde XP-order (klopt).

---

## 3. Checkout

### 3.1 Orderoverzicht met configuratie
**Probleem:** Checkout toont items en totaal; details van wat je precies bestelt (configuratie) ontbreken.

**Verbetering:** Zelfde **configuratiesamenvatting** als in de cart (zie 2.1) op de checkoutpagina bij elk item, eventueel uitklapbaar ("Wat heb ik gekozen?").

### 3.2 Duidelijke stappen en vertrouwen
- **Stap-indicator:** "Winkelwagen → Gegevens controleren → Betalen" (of 2 stappen als je geen aparte "gegevens"-stap hebt).
- Korte trust-zinnen bij de betaalknoppen: "Veilig betalen · Geen accountgegevens opgeslagen" (indien van toepassing).

### 3.3 Optioneel: winkelwagen bewaren
- Als de gebruiker uitcheckt zonder te betalen (terug, of sessie verloopt), blijft de cart in localStorage bestaan (dat heb je al). Je kunt expliciet maken: "We bewaren je winkelwagen 7 dagen" in de footer van de cart.

---

## 4. Technische verbeteringen configurator

### 4.1 Cart item id zonder timestamp (voor edit)
- Nu: `id: \`${service.id}-${selections["skill"] ?? "default"}-${Date.now()}\``.
- Voor "bewerken in cart": je wilt een **vaste id** per regel. Optie: id = `uuid()` bij eerste add en die id in de cart bewaren; bij edit hetzelfde id hergebruiken. Dan kan de servicepagina "edit mode" herkennen aan een cart item id die al bestaat.

### 4.2 Configurator in kleinere componenten
- De huidige `service-configurator.tsx` is >2000 regels. Opdelen in:
  - `ConfiguratorPriceBlock` (prijs + breakdown + CTA)
  - `ConfiguratorFormFields` (generieke velden: select, radio, multi_select, text, etc.)
  - `ConfiguratorXpRoute` (skill + segments)
  - `ConfiguratorBossTiered` (boss + kills + stats)
  - `ConfiguratorGear` (loadout selector + GearLoadoutPanel)
- Dat maakt stappen (1.1) en tests eenvoudiger.

### 4.3 URL state (optioneel)
- Belangrijke selecties (skill, quantity, boss) in de URL zetten (query params). Dan kunnen gebruikers een specifieke configuratie delen of bookmarken, en "terug" werkt voorspelbaar.

---

## 5. Prioritering

| Prioriteit | Onderdeel | Impact | Moeite |
|------------|-----------|--------|--------|
| Hoog | Configuratiesamenvatting in cart + checkout (2.1, 3.1) | Klant ziet wat hij bestelt | Laag |
| Hoog | Validatiefeedback bij Add to cart (1.4) | Minder frustratie, minder afhakers | Laag |
| Medium | Bewerken vanuit winkelwagen (2.2) | Minder heen-en-weer | Medium |
| Medium | Prijsopbouw uitklapbaar (1.3) | Vertrouwen, transparantie | Laag |
| Medium | Presets / aanbevolen (1.2) | Sneller bestellen voor nieuwe klanten | Medium |
| Lager | Stappen per configurator (1.1) | Minder overweldigend op mobiel | Hoog |
| Lager | Zelfde config mergen (2.3) | Nettere cart | Laag |
| Lager | Component-splitsing (4.2) | Onderhoud, stappen later | Medium |

Aanbevolen eerste stappen: **2.1 + 1.4** (samenvatting cart/checkout, validatiefeedback). Daarna **2.2** (bewerken vanuit cart) of **1.3** (prijsopbouw).

Als je wilt, kan ik een van deze verbeteringen (bijv. configuratiesamenvatting in de cart, of validatiefeedback) concreet uitwerken in code.
