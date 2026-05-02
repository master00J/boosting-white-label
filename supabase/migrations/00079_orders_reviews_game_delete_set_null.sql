-- Orders/reviews keep historical rows when a game is removed; game_id is nullable.
-- Without this, DELETE FROM games fails with orders_game_id_fkey / reviews_game_id_fkey.

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_game_id_fkey;
ALTER TABLE orders
  ADD CONSTRAINT orders_game_id_fkey
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE SET NULL;

ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_game_id_fkey;
ALTER TABLE reviews
  ADD CONSTRAINT reviews_game_id_fkey
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE SET NULL;

-- Deleting a game CASCADE-deletes its services; keep orders/reviews rows with nullable service_id.
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_service_id_fkey;
ALTER TABLE orders
  ADD CONSTRAINT orders_service_id_fkey
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL;

ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_service_id_fkey;
ALTER TABLE reviews
  ADD CONSTRAINT reviews_service_id_fkey
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL;
