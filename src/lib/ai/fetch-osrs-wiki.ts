/**
 * Fetch real-time quest (or other) info from the OSRS Wiki via MediaWiki API.
 * Use this to inject up-to-date context into AI prompts (helpdesk, order-from-description).
 * Only call server-side (API routes); do not expose wiki API key if you add one later.
 */

const WIKI_API = "https://oldschool.runescape.wiki/api.php";

export interface WikiLookupResult {
  title: string;
  extract: string;
  url: string;
}

/**
 * Normalise a quest name for wiki page title: "Dragon Slayer 2" → "Dragon Slayer II"
 * Add more mappings as needed for common aliases.
 */
const QUEST_ALIASES: Record<string, string> = {
  "dragon slayer 2": "Dragon Slayer II",
  "ds2": "Dragon Slayer II",
  "dragon slayer ii": "Dragon Slayer II",
  "song of the elves": "Song of the Elves",
  "sote": "Song of the Elves",
  "recipe for disaster": "Recipe for Disaster",
  "rfd": "Recipe for Disaster",
  "monkey madness 2": "Monkey Madness II",
  "mm2": "Monkey Madness II",
  "desert treasure": "Desert Treasure I",
  "dt": "Desert Treasure I",
  "desert treasure 2": "Desert Treasure II",
  "dt2": "Desert Treasure II",
  "legends quest": "Legend's Quest",
  "inferno": "Inferno",
  "fight caves": "TzHaar Fight Cave",
};

function normaliseTitle(input: string): string {
  const trimmed = input.trim().toLowerCase();
  return QUEST_ALIASES[trimmed] ?? input.trim().replace(/\s+/g, " ");
}

/**
 * Fetch a short extract (and optionally full page) for a quest from the OSRS Wiki.
 * Returns text suitable for appending to an AI prompt. Uses plain-text extract;
 * for full requirements you could extend this to parse the "Requirements" section.
 */
export async function fetchOsrsWikiQuestSummary(questOrTopic: string): Promise<WikiLookupResult | null> {
  const title = normaliseTitle(questOrTopic);
  const wikiTitle = title.replace(/\s+/g, "_");

  try {
    const url = new URL(WIKI_API);
    url.searchParams.set("action", "query");
    url.searchParams.set("titles", wikiTitle);
    url.searchParams.set("prop", "extracts");
    url.searchParams.set("exintro", "false");
    url.searchParams.set("explaintext", "true");
    url.searchParams.set("exsectionformat", "plain");
    url.searchParams.set("exsentences", "15");
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*");

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "BoostPlatform/1.0 (Support bot; contact support)" },
      next: { revalidate: 3600 }, // cache 1 hour if using Next fetch
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      query?: {
        pages?: Record<
          string,
          { title?: string; extract?: string; missing?: boolean }
        >;
      };
    };

    const pages = data.query?.pages;
    if (!pages) return null;

    const page = Object.values(pages)[0];
    if (!page || "missing" in page || !page.extract) return null;

    const pageTitle = page.title ?? title;
    const wikiPageUrl = `https://oldschool.runescape.wiki/w/${encodeURIComponent(pageTitle.replace(/\s+/g, "_"))}`;

    return {
      title: pageTitle,
      extract: page.extract.trim(),
      url: wikiPageUrl,
    };
  } catch {
    return null;
  }
}

/**
 * Returns a string block to inject into an AI prompt: "Real-time info from OSRS Wiki: ..."
 */
export async function getOsrsWikiContextForPrompt(questOrTopic: string): Promise<string> {
  const result = await fetchOsrsWikiQuestSummary(questOrTopic);
  if (!result || !result.extract) return "";

  return [
    "",
    "--- Real-time info (OSRS Wiki) ---",
    `Quest: ${result.title}`,
    result.extract,
    `Source: ${result.url}`,
    "---",
  ].join("\n");
}
