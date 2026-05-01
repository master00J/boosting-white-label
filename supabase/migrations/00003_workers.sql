-- =============================================
-- WORKER TIERS (fully dynamic, admin-defined)
-- =============================================

CREATE TABLE worker_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT '⭐',
  sort_order INT DEFAULT 0,
  commission_rate DECIMAL(5,4) DEFAULT 0.5500,
  max_active_orders INT DEFAULT 2,
  min_completed_orders INT DEFAULT 0,
  min_rating DECIMAL(3,2) DEFAULT 0,
  is_invite_only BOOLEAN DEFAULT FALSE,
  is_default BOOLEAN DEFAULT FALSE,
  discord_role_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER worker_tiers_updated_at
  BEFORE UPDATE ON worker_tiers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Ensure only one default tier
CREATE UNIQUE INDEX idx_worker_tiers_default ON worker_tiers (is_default) WHERE is_default = TRUE;

-- =============================================
-- WORKERS
-- =============================================

CREATE TABLE workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  tier_id UUID REFERENCES worker_tiers(id),
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  commission_rate DECIMAL(5,4) DEFAULT 0.5500,
  total_earned DECIMAL(10,2) DEFAULT 0,
  pending_balance DECIMAL(10,2) DEFAULT 0,
  total_orders_completed INT DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  total_ratings INT DEFAULT 0,
  games JSONB DEFAULT '[]',
  max_active_orders INT DEFAULT 2,
  current_active_orders INT DEFAULT 0,
  payout_method TEXT,
  payout_details_encrypted TEXT,
  payout_minimum DECIMAL(10,2) DEFAULT 25.00,
  notes TEXT,
  application_text TEXT,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER workers_updated_at
  BEFORE UPDATE ON workers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- When a worker is verified, set their profile role to 'worker'
CREATE OR REPLACE FUNCTION handle_worker_verified()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_verified = TRUE AND OLD.is_verified = FALSE THEN
    UPDATE profiles SET role = 'worker' WHERE id = NEW.profile_id;
    NEW.verified_at = NOW();

    -- Assign default tier if none set
    IF NEW.tier_id IS NULL THEN
      SELECT id INTO NEW.tier_id FROM worker_tiers WHERE is_default = TRUE LIMIT 1;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_worker_verified
  BEFORE UPDATE ON workers
  FOR EACH ROW EXECUTE FUNCTION handle_worker_verified();
