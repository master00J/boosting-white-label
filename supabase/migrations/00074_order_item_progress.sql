-- Per-item progress tracking for multi-item orders.
-- item_progress stores an array of progress objects, one per order item.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS item_progress JSONB;

-- Enable realtime on orders (ignore if already a member).
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE orders;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
