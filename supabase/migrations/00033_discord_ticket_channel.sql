-- Add discord_ticket_channel_id to orders
-- Stores the Discord channel ID of the private ticket created for this order

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS discord_ticket_channel_id TEXT;
