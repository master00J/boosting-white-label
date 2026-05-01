-- Add split support to orders table
-- parent_order_id: links a sub-order back to the original multi-item order
-- is_split: marks the parent order as having been split into sub-orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS parent_order_id UUID REFERENCES orders(id),
  ADD COLUMN IF NOT EXISTS is_split BOOLEAN DEFAULT false;

-- Add 'split' as a valid order status
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'split';
