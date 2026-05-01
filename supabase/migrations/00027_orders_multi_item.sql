-- Add items JSONB column to orders for multi-item cart support
-- Each item: { serviceId, serviceName, gameName, gameId, quantity, finalPrice, configuration }
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS items JSONB,
  ADD COLUMN IF NOT EXISTS item_count INT DEFAULT 1;

-- Make service_id and game_id nullable (multi-item orders may span multiple services/games)
ALTER TABLE orders
  ALTER COLUMN service_id DROP NOT NULL,
  ALTER COLUMN game_id DROP NOT NULL;
