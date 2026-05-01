-- =============================================
-- MULTI-CURRENCY & GOLD PAYMENT
-- =============================================

-- Add gold payment columns to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS gold_amount BIGINT,
  ADD COLUMN IF NOT EXISTS gold_received BOOLEAN DEFAULT false;

-- Update currency default to USD
ALTER TABLE orders ALTER COLUMN currency SET DEFAULT 'USD';

-- Add currency_rates setting
INSERT INTO site_settings (key, value)
VALUES (
  'currency_rates',
  '{
    "usd_eur_rate": 0.92,
    "games": {}
  }'
)
ON CONFLICT (key) DO NOTHING;

-- Update general settings: switch primary currency to USD
UPDATE site_settings
SET value = value || '{"currency": "USD", "currency_symbol": "$"}'
WHERE key = 'general';

-- Update payments setting to include gold
UPDATE site_settings
SET value = value || '{"gold_enabled": false}'
WHERE key = 'payments';
