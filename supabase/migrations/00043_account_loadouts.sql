-- =============================================
-- ACCOUNT LOADOUTS (OSRS stats per account slot)
-- =============================================

CREATE TABLE account_loadouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game_id UUID REFERENCES games(id) ON DELETE SET NULL,
  name TEXT NOT NULL DEFAULT 'Main Account',
  stats JSONB NOT NULL DEFAULT '{}',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_account_loadouts_profile ON account_loadouts(profile_id);
CREATE INDEX idx_account_loadouts_game ON account_loadouts(game_id);

-- Track which loadout is active for pricing (used in builder/checkout)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_loadout_id UUID REFERENCES account_loadouts(id) ON DELETE SET NULL;

CREATE TRIGGER account_loadouts_updated_at
  BEFORE UPDATE ON account_loadouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE account_loadouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own loadouts"
  ON account_loadouts FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);
