/**
 * One-shot: haalt F2P + Members questtitels van de OSRS Wiki en schrijft TS voor de catalog seed.
 * Run vanuit repo-root: node scripts/generate-osrs-wiki-quests.mjs
 */
import fs from "fs";
import https from "https";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "CodecraftCatalogSeed/1.0" } }, (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(d));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

async function categoryTitles(cmtitle) {
  const url = `https://oldschool.runescape.wiki/api.php?action=query&format=json&list=categorymembers&cmtitle=${encodeURIComponent(cmtitle)}&cmlimit=500`;
  const j = await fetchJson(url);
  const members = j.query?.categorymembers ?? [];
  return members.filter((m) => m.ns === 0).map((m) => m.title);
}

(async () => {
  const f2p = new Set(await categoryTitles("Category:Free-to-play quests"));
  const mem = new Set(await categoryTitles("Category:Members' quests"));

  /** @type {{ name: string; is_members: boolean }[]} */
  const rows = [];
  const seen = new Set();

  for (const name of f2p) {
    if (name.includes("/") || name === "Quests") continue;
    seen.add(name);
    rows.push({ name, is_members: false });
  }
  for (const name of mem) {
    if (name.includes("/") || name === "Quests") continue;
    if (seen.has(name)) continue;
    seen.add(name);
    rows.push({ name, is_members: true });
  }

  rows.sort((a, b) => a.name.localeCompare(b.name));

  const outPath = path.join(__dirname, "..", "src", "lib", "osrs-wiki-quests.generated.ts");
  const body = rows.map((r) => `  { name: ${JSON.stringify(r.name)}, is_members: ${r.is_members} },`).join("\n");
  const src = `export type OsrsWikiQuestRow = { name: string; is_members: boolean };\n\nexport const OSRS_WIKI_QUESTS: OsrsWikiQuestRow[] = [\n${body}\n];\n`;
  fs.writeFileSync(outPath, src, "utf8");
  console.log(`Wrote ${rows.length} quests to ${outPath}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
