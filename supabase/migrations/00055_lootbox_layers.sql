-- Add per-lootbox animation layer image URLs
-- Admins can now upload all 7 PNG layers per lootbox via the admin panel.
-- When NULL, the storefront falls back to the static /public/lootboxes/{tier}/ assets.
ALTER TABLE lootboxes
  ADD COLUMN IF NOT EXISTS layer_closed   TEXT,
  ADD COLUMN IF NOT EXISTS layer_base     TEXT,
  ADD COLUMN IF NOT EXISTS layer_lid      TEXT,
  ADD COLUMN IF NOT EXISTS layer_open     TEXT,
  ADD COLUMN IF NOT EXISTS layer_glow     TEXT,
  ADD COLUMN IF NOT EXISTS layer_particles TEXT,
  ADD COLUMN IF NOT EXISTS layer_beam     TEXT;
