-- Add game_id to service_categories so categories are game-specific
ALTER TABLE service_categories
  ADD COLUMN IF NOT EXISTS game_id uuid REFERENCES games(id) ON DELETE CASCADE;

-- Index for fast lookups per game
CREATE INDEX IF NOT EXISTS idx_service_categories_game_id ON service_categories(game_id);

-- Drop the old global unique constraint on slug
ALTER TABLE service_categories
  DROP CONSTRAINT IF EXISTS service_categories_slug_key;

-- Add a new unique constraint scoped per game: same slug allowed in different games
ALTER TABLE service_categories
  ADD CONSTRAINT service_categories_game_slug_key UNIQUE (game_id, slug);
