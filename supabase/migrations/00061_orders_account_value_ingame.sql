-- =============================================
-- Order account value in in-game currency
-- Customer enters value in game currency (e.g. GP); converted to USD via admin currency settings.
-- =============================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS account_value_ingame DECIMAL(18,0) DEFAULT NULL;

COMMENT ON COLUMN orders.account_value_ingame IS 'Value on customer account in in-game currency (e.g. GP); account_value (USD) = this / gold_per_usd from currency_rates.';
