-- Add OSRS item delivery tracking to lootbox_opens
ALTER TABLE lootbox_opens
  ADD COLUMN IF NOT EXISTS delivery_status TEXT NOT NULL DEFAULT 'not_applicable'
    CHECK (delivery_status IN ('not_applicable', 'pending', 'in_progress', 'delivered', 'cancelled')),
  ADD COLUMN IF NOT EXISTS delivery_notes  TEXT,
  ADD COLUMN IF NOT EXISTS delivered_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_by    UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Index for fast admin queries on pending deliveries
CREATE INDEX IF NOT EXISTS idx_lootbox_opens_delivery_status
  ON lootbox_opens(delivery_status)
  WHERE delivery_status != 'not_applicable';

-- Allow admins to update delivery fields
CREATE POLICY "Admins update lootbox opens"
  ON lootbox_opens FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());
