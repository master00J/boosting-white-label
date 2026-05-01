-- Add equipment JSONB to account_loadouts
-- Stores { head: "ahrims_hood", cape: "avas_accumulator", ... }
ALTER TABLE account_loadouts ADD COLUMN IF NOT EXISTS equipment JSONB NOT NULL DEFAULT '{}';
