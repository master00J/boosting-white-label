-- Add affiliate columns to orders if they don't exist yet
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS affiliate_id UUID REFERENCES affiliates(id),
  ADD COLUMN IF NOT EXISTS affiliate_commission DECIMAL(10,2) DEFAULT 0;
