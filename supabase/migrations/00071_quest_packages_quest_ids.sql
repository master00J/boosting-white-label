-- Add quest_ids TEXT[] column to quest_packages so slugs can be stored directly
-- (avoids UUID FK dependency on game_quests for the admin form)
ALTER TABLE quest_packages ADD COLUMN IF NOT EXISTS quest_ids TEXT[] DEFAULT '{}';
