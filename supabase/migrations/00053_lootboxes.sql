-- =============================================
-- LOOTBOX SYSTEM
-- =============================================

CREATE TABLE lootboxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  cost_points INT NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE lootbox_prizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lootbox_id UUID NOT NULL REFERENCES lootboxes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  prize_type TEXT NOT NULL CHECK (prize_type IN ('balance_credit', 'coupon')),
  prize_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  weight INT NOT NULL DEFAULT 1,
  image_url TEXT,
  rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'legendary')),
  coupon_config JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE lootbox_opens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lootbox_id UUID NOT NULL REFERENCES lootboxes(id) ON DELETE CASCADE,
  prize_id UUID NOT NULL REFERENCES lootbox_prizes(id) ON DELETE CASCADE,
  prize_snapshot JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lootbox_prizes_lootbox ON lootbox_prizes(lootbox_id);
CREATE INDEX idx_lootbox_opens_profile ON lootbox_opens(profile_id);
CREATE INDEX idx_lootbox_opens_lootbox ON lootbox_opens(lootbox_id);

-- RLS
ALTER TABLE lootboxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lootbox_prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lootbox_opens ENABLE ROW LEVEL SECURITY;

-- Everyone can read active lootboxes
CREATE POLICY "Anyone can view active lootboxes"
  ON lootboxes FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage lootboxes"
  ON lootboxes FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Everyone can read prizes for active lootboxes
CREATE POLICY "Anyone can view active prizes"
  ON lootbox_prizes FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage lootbox prizes"
  ON lootbox_prizes FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Users see own opens, admins see all
CREATE POLICY "Users view own lootbox opens"
  ON lootbox_opens FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Admins view all lootbox opens"
  ON lootbox_opens FOR SELECT
  USING (is_admin());

-- Insert via service role only (no direct insert policy for users)

-- Grant service role full access
GRANT ALL ON lootboxes TO service_role;
GRANT ALL ON lootbox_prizes TO service_role;
GRANT ALL ON lootbox_opens TO service_role;
