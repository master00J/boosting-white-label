-- Drop the old unique constraint on (game_id, slug)
ALTER TABLE services
  DROP CONSTRAINT IF EXISTS services_game_id_slug_key;

-- Add a new unique constraint scoped per game + category
-- Same slug is allowed across different categories within the same game
ALTER TABLE services
  ADD CONSTRAINT services_game_category_slug_key UNIQUE (game_id, category_id, slug);
