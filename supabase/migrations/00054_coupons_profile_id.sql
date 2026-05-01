-- Add profile_id to coupons for user-specific coupons (e.g. lootbox prizes)
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Index for fast lookup of a user's personal coupons
CREATE INDEX IF NOT EXISTS idx_coupons_profile_id ON coupons(profile_id) WHERE profile_id IS NOT NULL;

-- RLS: users can read their own coupons
CREATE POLICY "Users can view their own coupons"
  ON coupons FOR SELECT
  USING (profile_id = auth.uid());
