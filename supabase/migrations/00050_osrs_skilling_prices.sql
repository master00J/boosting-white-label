-- =============================================
-- OSRS SKILLING PRICES (GP per XP per method/level range)
-- Imported from legacy fg_skilling_prices
-- =============================================

CREATE TABLE IF NOT EXISTS osrs_skilling_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  skill_slug TEXT NOT NULL,
  method_id INT NOT NULL,
  method_name TEXT NOT NULL,
  level_min INT NOT NULL,
  level_max INT NOT NULL,
  gp_per_xp DECIMAL(12,2) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, skill_slug, method_id, level_min, level_max)
);

CREATE INDEX idx_osrs_skilling_prices_game_skill ON osrs_skilling_prices(game_id, skill_slug);
CREATE INDEX idx_osrs_skilling_prices_level ON osrs_skilling_prices(skill_slug, level_min, level_max);

CREATE TRIGGER osrs_skilling_prices_updated_at
  BEFORE UPDATE ON osrs_skilling_prices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

GRANT SELECT ON public.osrs_skilling_prices TO anon;
GRANT SELECT ON public.osrs_skilling_prices TO authenticated;
