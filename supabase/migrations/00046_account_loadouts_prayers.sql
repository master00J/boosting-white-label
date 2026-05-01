-- Add prayers to account_loadouts: { melee: string[], range: string[], mage: string[] }
ALTER TABLE account_loadouts ADD COLUMN IF NOT EXISTS prayers JSONB DEFAULT '{"melee":[],"range":[],"mage":[]}';
