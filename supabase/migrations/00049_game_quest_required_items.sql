-- =============================================
-- QUEST REQUIRED ITEMS (items needed per quest)
-- =============================================

CREATE TABLE IF NOT EXISTS game_quest_required_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES game_quests(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  item_id TEXT,
  quantity INT NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(quest_id, item_name)
);

CREATE INDEX idx_quest_required_items_quest ON game_quest_required_items(quest_id);
CREATE INDEX idx_quest_required_items_name ON game_quest_required_items(lower(item_name));

GRANT SELECT ON public.game_quest_required_items TO anon;
GRANT SELECT ON public.game_quest_required_items TO authenticated;
