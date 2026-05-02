-- Game catalog: skills (XP setup), quests (quest pricing / wiki fetch), service methods (shared training methods).
-- Safe on fresh DBs; IF NOT EXISTS skips when tables were created manually earlier.

CREATE TABLE IF NOT EXISTS game_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (game_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_game_skills_game ON game_skills(game_id);

CREATE TABLE IF NOT EXISTS game_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  difficulty TEXT,
  length TEXT,
  quest_points INT NOT NULL DEFAULT 0,
  series TEXT,
  is_members BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (game_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_game_quests_game ON game_quests(game_id);
CREATE INDEX IF NOT EXISTS idx_game_quests_slug ON game_quests(game_id, slug);

CREATE TABLE IF NOT EXISTS game_service_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES game_skills(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  multiplier DECIMAL(12, 4) NOT NULL DEFAULT 1.0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (game_id, skill_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_game_service_methods_game ON game_service_methods(game_id);
CREATE INDEX IF NOT EXISTS idx_game_service_methods_skill ON game_service_methods(skill_id);

ALTER TABLE game_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_service_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "game_skills_select" ON game_skills;
CREATE POLICY "game_skills_select" ON game_skills FOR SELECT USING (true);
DROP POLICY IF EXISTS "game_skills_admin_all" ON game_skills;
CREATE POLICY "game_skills_admin_all" ON game_skills FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "game_quests_select" ON game_quests;
CREATE POLICY "game_quests_select" ON game_quests FOR SELECT USING (true);
DROP POLICY IF EXISTS "game_quests_admin_all" ON game_quests;
CREATE POLICY "game_quests_admin_all" ON game_quests FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "game_service_methods_select" ON game_service_methods;
CREATE POLICY "game_service_methods_select" ON game_service_methods FOR SELECT USING (true);
DROP POLICY IF EXISTS "game_service_methods_admin_all" ON game_service_methods;
CREATE POLICY "game_service_methods_admin_all" ON game_service_methods FOR ALL USING (is_admin());

GRANT SELECT ON public.game_skills TO anon;
GRANT SELECT ON public.game_skills TO authenticated;
GRANT SELECT ON public.game_quests TO anon;
GRANT SELECT ON public.game_quests TO authenticated;
GRANT SELECT ON public.game_service_methods TO anon;
GRANT SELECT ON public.game_service_methods TO authenticated;
