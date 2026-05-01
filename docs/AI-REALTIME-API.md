# AI verbinden met real-time API’s

De AI kan real-time informatie gebruiken op twee manieren: **backend haalt data op** (eenvoudig) of **AI roept zelf tools aan** (flexibel).

---

## 1. Backend haalt API op vóór de AI (aanbevolen om te starten)

**Idee:** Voordat je de prompt naar de AI stuurt, roept jouw backend een API aan (bijv. OSRS Wiki), haalt de benodigde info op en zet die in de prompt als extra context.

**Flow:**
1. Gebruiker: “Wat heb ik nodig voor Dragon Slayer 2?”
2. Backend ziet dat het over een quest gaat → roept `fetchOsrsWikiQuestSummary("Dragon Slayer II")` aan.
3. Backend krijgt een korte tekst terug (requirements, skills, quests).
4. Backend bouwt de prompt: vaste knowledge base + **dit wiki-fragment** + het bericht van de gebruiker.
5. AI antwoordt met actuele info.

**Voordelen:** Eenvoudig, geen tool/function calling nodig, werkt met elke AI-provider.  
**Nadeel:** De backend moet “raden” wanneer hij moet lookuppen (bijv. als de vraag een questnaam bevat). Dat kan met simpele keywords of een kleine classifier.

**Plaats in de code:** In de helpdesk-API (of in `generateHelpdeskResponse`) kun je vóór het aanroepen van de AI:
- de laatste gebruikersvraag scannen op questnamen (of een lijst van “lookup-termen”);
- indien match: `fetchOsrsWikiQuestSummary(questName)` aanroepen en de returnwaarde in de system prompt of in een extra “context”-blok zetten.

---

## 2. AI roept zelf een “tool” aan (function calling)

**Idee:** De AI krijgt een beschrijving van een functie, bijv. “lookup_osrs_wiki(onderwerp)”. Als de AI denkt dat hij actuele info nodig heeft, vraagt hij om een aanroep. De backend voert die uit en geeft het resultaat terug aan de AI; de AI gebruikt het in zijn antwoord.

**Flow:**
1. Gebruiker: “Wat heb ik nodig voor Dragon Slayer 2?”
2. Backend stuurt naar de AI: prompt + beschikbare tools: `lookup_osrs_wiki(topic: string)`.
3. AI antwoordt met een “tool call”: `lookup_osrs_wiki("Dragon Slayer II")`.
4. Backend roept de OSRS Wiki (of eigen API) aan, krijgt requirements terug.
5. Backend stuurt dat resultaat terug naar de AI: “Tool result: …”
6. AI formuleert het definitieve antwoord met die actuele info.

**Voordelen:** De AI beslist zelf wanneer hij iets opzoekt; één keer bouwen en herbruikbaar voor meerdere soorten vragen.  
**Nadelen:** Vereist tool/function calling (OpenAI of Anthropic), iets meer code en prompt-engineering.

**Implementatie:** In `lib/ai` een “tool” definiëren (naam, parameters, beschrijving). In de helpdesk- of order-from-description-flow de completion aanroepen met `tools: [osrsWikiLookupTool]`. Bij het verwerken van het response: als er een `tool_calls`-array is, voor elke call de juiste functie aanroepen (bijv. wiki-fetch) en de resultaten in een volgend bericht teruggeven.

---

## Welke API’s?

| Bron | Wat | Hoe |
|------|-----|-----|
| **OSRS Wiki** | Quest requirements, skill levels, items | MediaWiki API: `api.php?action=query&titles=...&prop=extracts` of `revisions` en lokaal de “Requirements”-sectie parsen. |
| **Eigen backend** | Catalogus, prijzen, beschikbare services | Bestaande Supabase/API-routes; backend roept die aan en stopt het in de prompt of als tool-result. |
| **Andere game-wikis** | Zelfde idee | Hun API of scrape; alleen server-side aanroepen. |

---

## Aanbeveling

- **Fase 1:** Backend pre-fetch (sectie 1): in de helpdesk (en later order-from-description) een “context enricher” die bij quest-gerelateerde vragen `fetchOsrsWikiQuestSummary` aanroept en de tekst in de prompt plakt. Geen tool use nodig.
- **Fase 2:** Als je meer vragen hebt waar de AI zelf moet beslissen “ik zoek even X op”, dan tool use (sectie 2) toevoegen en dezelfde wiki-fetch als implementatie van die tool gebruiken.

In de code staat al een voorbeeld van een server-side fetch: `lib/ai/fetch-osrs-wiki.ts` (of vergelijkbaar). Die kun je vanuit de helpdesk-API aanroepen wanneer je een questnaam in het ticket herkent.
