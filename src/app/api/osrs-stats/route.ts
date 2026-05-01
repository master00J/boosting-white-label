import { NextRequest, NextResponse } from "next/server";
import { getRateLimitIdentifier, checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const SKILL_ORDER = [
  "overall",
  "attack",
  "defence",
  "strength",
  "hitpoints",
  "ranged",
  "prayer",
  "magic",
  "cooking",
  "woodcutting",
  "fletching",
  "fishing",
  "firemaking",
  "crafting",
  "smithing",
  "mining",
  "herblore",
  "agility",
  "thieving",
  "slayer",
  "farming",
  "runecrafting",
  "hunter",
  "construction",
];

export async function GET(req: NextRequest) {
  const rl = await checkRateLimit(getRateLimitIdentifier(req), RATE_LIMITS.general);
  if (rl) return rl;

  const player = req.nextUrl.searchParams.get("player")?.trim();

  if (!player) {
    return NextResponse.json({ error: "Missing player name" }, { status: 400 });
  }

  const url = `https://secure.runescape.com/m=hiscore_oldschool/index_lite.ws?player=${encodeURIComponent(player)}`;

  let text: string;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "BoostPlatform/1.0" },
      next: { revalidate: 60 }, // cache 60s
    });

    if (res.status === 404) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }
    if (!res.ok) {
      return NextResponse.json({ error: "Hiscores unavailable" }, { status: 502 });
    }

    text = await res.text();
  } catch {
    return NextResponse.json({ error: "Failed to reach OSRS Hiscores" }, { status: 502 });
  }

  // Each line: rank,level,xp  (skills first, then activities)
  const lines = text.trim().split("\n");
  const stats: Record<string, number> = {};

  SKILL_ORDER.forEach((skill, i) => {
    const line = lines[i];
    if (!line) return;
    const parts = line.split(",");
    const level = parseInt(parts[1]);
    if (!isNaN(level) && level > 0) {
      stats[skill] = level;
    }
  });

  if (Object.keys(stats).length === 0) {
    return NextResponse.json({ error: "Could not parse stats" }, { status: 502 });
  }

  return NextResponse.json({ player, stats });
}
