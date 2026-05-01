-- =============================================
-- QUEST PACKAGES (multiple quests in one package)
-- =============================================
-- game_quests is assumed to exist (see PROGRESS.md / manual setup).

CREATE TABLE IF NOT EXISTS quest_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, slug)
);

CREATE TABLE IF NOT EXISTS quest_package_quests (
  package_id UUID NOT NULL REFERENCES quest_packages(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES game_quests(id) ON DELETE CASCADE,
  sort_order INT DEFAULT 0,
  PRIMARY KEY (package_id, quest_id)
);

CREATE INDEX idx_quest_packages_game ON quest_packages(game_id);
CREATE INDEX idx_quest_package_quests_package ON quest_package_quests(package_id);
CREATE INDEX idx_quest_package_quests_quest ON quest_package_quests(quest_id);

CREATE TRIGGER quest_packages_updated_at
  BEFORE UPDATE ON quest_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

GRANT SELECT ON public.quest_packages TO anon;
GRANT SELECT ON public.quest_packages TO authenticated;
GRANT ALL ON public.quest_packages TO service_role;
GRANT SELECT ON public.quest_package_quests TO anon;
GRANT SELECT ON public.quest_package_quests TO authenticated;
GRANT ALL ON public.quest_package_quests TO service_role;
