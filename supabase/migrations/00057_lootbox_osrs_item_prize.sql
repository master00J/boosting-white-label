-- Add osrs_item as a valid prize type and add osrs_item_id column
ALTER TABLE lootbox_prizes
  DROP CONSTRAINT IF EXISTS lootbox_prizes_prize_type_check;

ALTER TABLE lootbox_prizes
  ADD CONSTRAINT lootbox_prizes_prize_type_check
  CHECK (prize_type IN ('balance_credit', 'coupon', 'osrs_item'));

ALTER TABLE lootbox_prizes
  ADD COLUMN IF NOT EXISTS osrs_item_id TEXT;
