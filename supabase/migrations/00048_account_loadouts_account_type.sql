-- Account type: normal, ironman, ultimate_ironman, hardcore_ironman, ultimate_hardcore_ironman
ALTER TABLE account_loadouts ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'normal';
