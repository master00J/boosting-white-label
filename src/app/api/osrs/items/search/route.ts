import { NextRequest, NextResponse } from "next/server";

interface MappingItem {
  id: number;
  name: string;
  icon: string;
  examine?: string;
  members?: boolean;
}

interface SearchResult {
  id: number;
  name: string;
  icon_url: string;
}

const MAPPING_URL = "https://prices.runescape.wiki/api/v1/osrs/mapping";

function iconToUrl(icon: string): string {
  return (
    "https://oldschool.runescape.wiki/images/" +
    icon.replace(/ /g, "_")
  );
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.toLowerCase().trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json([] as SearchResult[]);
  }

  try {
    const res = await fetch(MAPPING_URL, {
      next: { revalidate: 86400 },
      headers: {
        "User-Agent": "BoostPlatform/1.0 (contact: support@example.com)",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch OSRS item data" },
        { status: 502 }
      );
    }

    const all: MappingItem[] = await res.json();

    const results: SearchResult[] = all
      .filter((item) => item.name.toLowerCase().includes(q))
      .slice(0, 20)
      .map((item) => ({
        id: item.id,
        name: item.name,
        icon_url: iconToUrl(item.icon),
      }));

    return NextResponse.json(results);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
