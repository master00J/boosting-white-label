/**
 * Parse quest items from OSRS Wiki wikitext.
 * Looks for |items = ... in {{Quest details}} template.
 * Extracts [[Item name]] or "N [[item]]s" patterns.
 */

export interface ParsedQuestItem {
  itemName: string;
  quantity: number;
}

/** Convert quest name to wiki page title: "Dragon Slayer II" → "Dragon_Slayer_II" */
export function questNameToWikiTitle(name: string): string {
  return name
    .replace(/\s+/g, "_")
    .replace(/'/g, "%27")
    .trim();
}

/** Extract items from |items = ... content (raw wikitext value) */
export function parseQuestItemsWikitext(itemsText: string): ParsedQuestItem[] {
  const result: ParsedQuestItem[] = [];
  const seen = new Set<string>();
  if (!itemsText || itemsText === "None") return result;

  const lines = itemsText.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Match: "At least 12 [[nail]]s" or "8 [[oak plank]]s"
    const qtyMatch = trimmed.match(
      /(?:[Aa]t\s+least\s+)?(\d+)\s*\[\[([^\]|]+)(?:\|[^\]]+)?\]\]([sS])?/i
    );
    if (qtyMatch) {
      const quantity = parseInt(qtyMatch[1], 10) || 1;
      let itemName = qtyMatch[2].trim();
      if (qtyMatch[3] && !itemName.toLowerCase().endsWith("s")) {
        itemName += "s";
      }
      const key = itemName.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ itemName, quantity });
      }
      continue;
    }

    // Match: * [[Item name]] or * A [[Item name]] (no quantity)
    const simpleMatch = trimmed.match(
      /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]([sS])?(?:\s|$|[(\[])/i
    );
    if (simpleMatch) {
      let itemName = simpleMatch[1].trim();
      const plural = simpleMatch[2];
      if (plural && !itemName.toLowerCase().endsWith("s")) {
        itemName += "s";
      }
      const key = itemName.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ itemName, quantity: 1 });
      }
    }
  }

  return result;
}

/** Extract |items = ... value from full quest page wikitext */
export function extractItemsParam(wikitext: string): string | null {
  if (!wikitext) return null;

  // Find {{Quest details ... }} template
  const templateStart = wikitext.indexOf("{{Quest details");
  if (templateStart === -1) return null;

  let depth = 1; // we're inside {{Quest details
  let i = templateStart + "{{Quest details".length;

  // Find the end of the template (matching }})
  while (i < wikitext.length - 1) {
    const two = wikitext.slice(i, i + 2);
    if (two === "{{") { depth++; i += 2; continue; }
    if (two === "}}") {
      depth--;
      if (depth === 0) break;
      i += 2;
      continue;
    }
    i++;
  }

  const templateContent = wikitext.slice(templateStart, i + 2);

  // Find |items = - capture until next template param (newline + pipe + keyword) or }}
  const itemsMatch = templateContent.match(
    /\|\s*items\s*=\s*([\s\S]*?)(?=\n\s*\|[a-zA-Z_]+\s*=|\}\})/i
  );
  if (!itemsMatch) return null;

  return itemsMatch[1].trim() || null;
}
