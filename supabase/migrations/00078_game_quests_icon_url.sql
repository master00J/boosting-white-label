-- Quest catalog icons (inventory-style wiki PNG URLs).
ALTER TABLE game_quests ADD COLUMN IF NOT EXISTS icon_url TEXT;
