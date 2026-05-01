-- ─── OSRS Items database ────────────────────────────────────────────────────
-- Stores all gear items with their combat stats fetched from the OSRS Wiki.
-- Used by the gear optimizer to suggest best-in-slot gear per boss/activity.

CREATE TABLE IF NOT EXISTS osrs_items (
  id            TEXT PRIMARY KEY,        -- OSRS numeric item ID (as text, e.g. "4151")
  name          TEXT NOT NULL,           -- Item name (e.g. "Abyssal whip")
  wiki_name     TEXT,                    -- Wiki page name (may differ from in-game name)
  slot          TEXT NOT NULL,           -- Equipment slot: head|cape|neck|ammo|weapon|shield|body|legs|hands|feet|ring|2h
  is_2h         BOOLEAN DEFAULT FALSE,   -- Two-handed weapon (occupies weapon + shield slot)
  is_members    BOOLEAN DEFAULT TRUE,

  -- Attack bonuses
  a_stab        INT DEFAULT 0,
  a_slash       INT DEFAULT 0,
  a_crush       INT DEFAULT 0,
  a_magic       INT DEFAULT 0,
  a_ranged      INT DEFAULT 0,

  -- Defence bonuses
  d_stab        INT DEFAULT 0,
  d_slash       INT DEFAULT 0,
  d_crush       INT DEFAULT 0,
  d_magic       INT DEFAULT 0,
  d_ranged      INT DEFAULT 0,

  -- Other bonuses
  melee_str     INT DEFAULT 0,           -- Melee strength bonus
  ranged_str    INT DEFAULT 0,           -- Ranged strength bonus
  magic_dmg     NUMERIC(5,2) DEFAULT 0,  -- Magic damage % (e.g. 12.00 = 12%)
  prayer        INT DEFAULT 0,           -- Prayer bonus
  weight        NUMERIC(6,2) DEFAULT 0,  -- Item weight in kg

  -- Level requirements
  req_attack    INT DEFAULT 1,
  req_strength  INT DEFAULT 1,
  req_defence   INT DEFAULT 1,
  req_ranged    INT DEFAULT 1,
  req_magic     INT DEFAULT 1,
  req_prayer    INT DEFAULT 1,

  -- Set membership (for set bonus detection)
  set_name      TEXT,                    -- e.g. "void", "dharoks", "bandos", "ancestral"

  -- Icon URL (from OSRS Wiki)
  icon_url      TEXT,

  -- Metadata
  last_updated  TIMESTAMPTZ DEFAULT NOW()
);

-- Index on slot for fast per-slot filtering
CREATE INDEX IF NOT EXISTS osrs_items_slot_idx ON osrs_items(slot);
CREATE INDEX IF NOT EXISTS osrs_items_name_idx ON osrs_items(name);
CREATE INDEX IF NOT EXISTS osrs_items_set_idx  ON osrs_items(set_name) WHERE set_name IS NOT NULL;

-- ─── Boss profiles table ──────────────────────────────────────────────────────
-- Stores optimizer profiles for every boss/activity in OSRS.

CREATE TABLE IF NOT EXISTS osrs_boss_profiles (
  id              TEXT PRIMARY KEY,       -- e.g. "bandos", "zulrah", "inferno"
  name            TEXT NOT NULL,          -- Display name, e.g. "General Graardor (Bandos)"
  category        TEXT NOT NULL,          -- "gwd" | "slayer" | "raid" | "wilderness" | "minigame" | "dt2" | "other"
  wiki_url        TEXT,

  -- Primary style: "melee" | "ranged" | "magic" | "multi"
  primary_style   TEXT NOT NULL DEFAULT 'melee',

  -- For multi-style content (Zulrah, ToB, etc.) — JSON array of phase objects
  phases          JSONB,

  -- Weight config per style — how much each stat matters (0–10 scale)
  -- { melee_str: 10, slash_attack: 8, prayer: 4, ... }
  melee_weights   JSONB DEFAULT '{}',
  ranged_weights  JSONB DEFAULT '{}',
  magic_weights   JSONB DEFAULT '{}',

  -- Special requirements / notes
  required_items  TEXT[],                 -- e.g. ARRAY['anti_dragon_shield'] for Vorkath
  notes           TEXT,
  is_wilderness   BOOLEAN DEFAULT FALSE,
  icon_url        TEXT,

  last_updated    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS osrs_boss_profiles_category_idx ON osrs_boss_profiles(category);

-- RLS: read-only for authenticated + anon, write only for service role
ALTER TABLE osrs_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE osrs_boss_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "osrs_items_read" ON osrs_items FOR SELECT USING (true);
CREATE POLICY "osrs_boss_profiles_read" ON osrs_boss_profiles FOR SELECT USING (true);
