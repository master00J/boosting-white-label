import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/assert-admin";
import { z } from "zod";

const BodySchema = z.object({
  url: z.string().min(1).max(2000),
});

export const dynamic = "force-dynamic";

type ParsedItem = {
  item_name: string;
  quantity: number;
  price_each: number;
};

/**
 * Proper CSV line parser that handles quoted fields (fields may contain commas).
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parse a price string into a number.
 * Handles:
 *   "200 M", "1,600 M", "75M"   → GP millions (returns raw number)
 *   "0,11 $", "17,6 $", "11 $"  → Euro with European comma decimal
 *   "0.11", "17.6"              → plain decimals
 */
function parsePrice(raw: string): number {
  const s = raw.trim();
  if (!s || s === "-") return 0;

  const hasDollar = s.includes("$");
  const hasMSuffix = /m$/i.test(s.replace(/\s/g, ""));

  // Strip currency/suffix symbols
  let numStr = s
    .replace(/\$/g, "")
    .replace(/m$/i, "")
    .replace(/\s/g, "");

  if (hasDollar) {
    // European decimal format: "0,11" → 0.11, "17,6" → 17.6, "1.600" → 1600
    // Rule: if comma present and ≤2 digits after → decimal separator
    //       if dot present and >2 digits after → thousands separator
    if (numStr.includes(",")) {
      const parts = numStr.split(",");
      const afterComma = parts[parts.length - 1] ?? "";
      if (parts.length === 2 && afterComma.length <= 4) {
        numStr = parts[0].replace(/\./g, "") + "." + afterComma;
      } else {
        numStr = numStr.replace(/,/g, "");
      }
    } else {
      // Remove thousands dots
      numStr = numStr.replace(/\./g, (_, offset, str) => {
        const afterDot = str.slice(offset + 1);
        return afterDot.length === 3 ? "" : ".";
      });
    }
  } else if (hasMSuffix) {
    // "1,600" in M context → thousands → 1600
    numStr = numStr.replace(/,/g, "");
  } else {
    numStr = numStr.replace(/,/g, "");
  }

  const n = parseFloat(numStr);
  return isNaN(n) ? 0 : n;
}

function parseQuantity(raw: string): number {
  const cleaned = raw.trim().replace(/[,.']/g, "");
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? 0 : n;
}

/**
 * Parse CSV rows from Google Sheets export.
 *
 * Supports two layouts:
 * 1. Single-table layout: one table per section, with a "Item Name / In Stock / Price" header row.
 * 2. Multi-table layout: multiple tables side-by-side in the same rows (each with their own header columns).
 *
 * Detection: if a header row contains "Item Name" in multiple column positions → multi-table mode.
 */
function parseSheetCsv(csvText: string): ParsedItem[] {
  const rows = csvText
    .split(/\r?\n/)
    .map((line) => parseCsvLine(line));

  type TableDef = { nameCol: number; stockCol: number; priceCol: number };
  let tableDefs: TableDef[] = [];
  const items: ParsedItem[] = [];

  for (const row of rows) {
    const lower = row.map((c) => c.toLowerCase().trim());

    // ── Detect header rows ──────────────────────────────────────────────
    const nameIndices = lower
      .map((c, i) => (c === "item name" || c === "item") ? i : -1)
      .filter((i) => i !== -1);

    if (nameIndices.length > 0) {
      tableDefs = nameIndices.map((nameCol) => {
        let stockCol = -1;
        let priceCol = -1;
        // Search in the next ~5 columns for stock/price headers
        for (let i = nameCol + 1; i < Math.min(row.length, nameCol + 6); i++) {
          const c = lower[i] ?? "";
          if (stockCol === -1 && (c.includes("stock") || c.includes("qty") || c.includes("quantity"))) stockCol = i;
          if (priceCol === -1 && (c.includes("price") || c.includes("prijs") || c === "$" || c.includes("cost"))) priceCol = i;
        }
        return {
          nameCol,
          stockCol: stockCol !== -1 ? stockCol : nameCol + 1,
          priceCol: priceCol !== -1 ? priceCol : nameCol + 2,
        };
      });
      continue;
    }

    if (tableDefs.length === 0) continue;

    // ── Extract items from each side-by-side table ──────────────────────
    for (const def of tableDefs) {
      const name = (row[def.nameCol] ?? "").trim();
      if (!name) continue;

      // Skip section headers (all caps, too long, URLs, etc.)
      if (name.length > 60) continue;
      if (/^[-\s*]+$/.test(name)) continue;
      if (/^[A-Z0-9\s\-&/!']+$/.test(name) && name.length > 25) continue;
      if (name.toLowerCase().startsWith("http") || name.toLowerCase().startsWith("discord")) continue;

      const rawStock = (row[def.stockCol] ?? "").trim();
      const rawPrice = (row[def.priceCol] ?? "").trim();

      const quantity = parseQuantity(rawStock);
      const price_each = parsePrice(rawPrice);

      // Skip if name looks like a sub-header and both values are empty/zero
      if (quantity === 0 && price_each === 0 && rawStock === "" && rawPrice === "") continue;

      items.push({ item_name: name, quantity, price_each });
    }
  }

  // Deduplicate — last occurrence wins (most recently updated stock/price)
  const seen = new Map<string, ParsedItem>();
  for (const item of items) {
    seen.set(item.item_name.toLowerCase(), item);
  }

  return Array.from(seen.values()).filter((i) => i.item_name.length > 1);
}

/**
 * Extract spreadsheet ID and gid from a Google Sheets URL.
 * Supports formats:
 *   https://docs.google.com/spreadsheets/d/{ID}/edit?gid={GID}
 *   https://docs.google.com/spreadsheets/d/{ID}/edit#gid={GID}
 *   https://docs.google.com/spreadsheets/d/{ID}/pub?gid={GID}
 */
function extractSheetParams(url: string): { id: string; gid: string } | null {
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!idMatch) return null;
  const id = idMatch[1];
  const gidMatch = url.match(/[?&#]gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : "0";
  return { id, gid };
}

// POST /api/admin/gim-shop/import-sheet
// Body: { url: string }
// Returns: { items: ParsedItem[] }
export async function POST(req: NextRequest) {
  try {
    const ctx = await assertAdmin();
    if (!ctx.ok) return ctx.response;

    const body = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const { url } = parsed.data;

    const params = extractSheetParams(url);
    if (!params) {
      return NextResponse.json(
        { error: "Could not extract spreadsheet ID from URL. Make sure it is a valid Google Sheets link." },
        { status: 400 }
      );
    }

    const csvUrl = `https://docs.google.com/spreadsheets/d/${params.id}/export?format=csv&gid=${params.gid}`;

    let csvText: string;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(csvUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return NextResponse.json(
          { error: "Could not fetch the sheet. Make sure it is shared as 'Anyone with the link can view'." },
          { status: 400 }
        );
      }
      csvText = await res.text();
    } catch {
      return NextResponse.json(
        { error: "Failed to fetch sheet. Check that the sheet is publicly accessible." },
        { status: 400 }
      );
    }

    const items = parseSheetCsv(csvText);

    if (items.length === 0) {
      return NextResponse.json(
        { error: "No items found in the sheet. Make sure it has columns: 'Item Name', 'In Stock', 'Price'." },
        { status: 400 }
      );
    }

    return NextResponse.json({ items, count: items.length });
  } catch (e) {
    console.error("[import-sheet]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
