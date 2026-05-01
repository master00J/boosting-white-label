-- Extra equipment & special weapons: array of weapon ids per slot
ALTER TABLE account_loadouts ADD COLUMN IF NOT EXISTS special_weapons JSONB DEFAULT '[]';
