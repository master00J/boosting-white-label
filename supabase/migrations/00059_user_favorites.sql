-- =============================================
-- USER FAVORITES (games)
-- =============================================

CREATE TABLE IF NOT EXISTS user_favorites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game_id    UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id, game_id)
);

CREATE INDEX IF NOT EXISTS user_favorites_profile_id_idx ON user_favorites(profile_id);
CREATE INDEX IF NOT EXISTS user_favorites_game_id_idx ON user_favorites(game_id);

ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own favorites
CREATE POLICY "Users can read own favorites"
  ON user_favorites FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Users can insert own favorites"
  ON user_favorites FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can delete own favorites"
  ON user_favorites FOR DELETE
  TO authenticated
  USING (profile_id = auth.uid());

-- Service role full access
CREATE POLICY "Service role full access on user_favorites"
  ON user_favorites FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
