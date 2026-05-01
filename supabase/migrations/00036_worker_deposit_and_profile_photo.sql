-- =============================================
-- Worker deposit (traceable) + profile photo + tier min_deposit
-- =============================================

-- Optional min deposit for tier (tier may require at least this deposit)
ALTER TABLE worker_tiers
  ADD COLUMN IF NOT EXISTS min_deposit DECIMAL(10,2) DEFAULT NULL;

COMMENT ON COLUMN worker_tiers.min_deposit IS 'Minimum total deposit required for this tier (optional)';

-- Total deposit paid by worker (updated by trigger from worker_deposit_payments)
ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS deposit_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

COMMENT ON COLUMN workers.deposit_paid IS 'Total deposit paid (sum of worker_deposit_payments)';
COMMENT ON COLUMN workers.profile_photo_url IS 'Optional profile photo URL for booster profile page (storage or external)';

-- Traceable deposit payments (admin records each payment)
CREATE TABLE IF NOT EXISTS worker_deposit_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS worker_deposit_payments_worker_id_idx ON worker_deposit_payments(worker_id);
CREATE INDEX IF NOT EXISTS worker_deposit_payments_paid_at_idx ON worker_deposit_payments(paid_at DESC);

ALTER TABLE worker_deposit_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage worker_deposit_payments"
  ON worker_deposit_payments FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Workers can view own deposit payments"
  ON worker_deposit_payments FOR SELECT
  TO authenticated
  USING (
    worker_id IN (SELECT id FROM workers WHERE profile_id = auth.uid())
  );

-- Update workers.deposit_paid when a payment is inserted
CREATE OR REPLACE FUNCTION update_worker_deposit_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE workers
  SET deposit_paid = COALESCE((
    SELECT SUM(amount) FROM worker_deposit_payments WHERE worker_id = NEW.worker_id
  ), 0)
  WHERE id = NEW.worker_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_worker_deposit_payment_insert
  AFTER INSERT ON worker_deposit_payments
  FOR EACH ROW EXECUTE FUNCTION update_worker_deposit_on_payment();

-- Also recalc on delete (e.g. if admin removes a mistaken entry)
CREATE OR REPLACE FUNCTION update_worker_deposit_on_payment_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE workers
  SET deposit_paid = COALESCE((
    SELECT SUM(amount) FROM worker_deposit_payments WHERE worker_id = OLD.worker_id
  ), 0)
  WHERE id = OLD.worker_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_worker_deposit_payment_delete
  AFTER DELETE ON worker_deposit_payments
  FOR EACH ROW EXECUTE FUNCTION update_worker_deposit_on_payment_delete();

-- Storage bucket for booster profile photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'booster-photos',
  'booster-photos',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Worker can upload to own path: {worker_id}/avatar.{ext}
CREATE POLICY "Workers can upload own booster photo"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'booster-photos'
    AND EXISTS (SELECT 1 FROM workers w WHERE w.profile_id = auth.uid() AND name LIKE w.id::text || '/%')
  );

CREATE POLICY "Workers can update own booster photo"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'booster-photos'
    AND EXISTS (SELECT 1 FROM workers w WHERE w.profile_id = auth.uid() AND name LIKE w.id::text || '/%')
  );

CREATE POLICY "Public can view booster photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'booster-photos');
