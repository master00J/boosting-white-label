-- =============================================
-- COUPONS (needed before orders for FK)
-- =============================================

CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type discount_type NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  max_discount DECIMAL(10,2),
  max_uses INT,
  max_uses_per_user INT DEFAULT 1,
  current_uses INT DEFAULT 0,
  applicable_games UUID[] DEFAULT '{}',
  applicable_services UUID[] DEFAULT '{}',
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- AFFILIATES (needed before orders for FK)
-- =============================================

CREATE TABLE affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE REFERENCES profiles(id),
  company_name TEXT,
  website_url TEXT,
  affiliate_code TEXT UNIQUE NOT NULL DEFAULT nanoid(10),
  commission_rate DECIMAL(5,4) DEFAULT 0.0800,
  cookie_days INT DEFAULT 30,
  total_clicks INT DEFAULT 0,
  total_conversions INT DEFAULT 0,
  total_earned DECIMAL(10,2) DEFAULT 0,
  pending_balance DECIMAL(10,2) DEFAULT 0,
  payout_method TEXT,
  payout_details_encrypted TEXT,
  payout_minimum DECIMAL(10,2) DEFAULT 50.00,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER affiliates_updated_at
  BEFORE UPDATE ON affiliates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- ORDERS
-- =============================================

CREATE SEQUENCE order_number_seq START 1;

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL DEFAULT '',
  track_token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::TEXT,
  customer_id UUID REFERENCES profiles(id),
  worker_id UUID REFERENCES workers(id),
  service_id UUID REFERENCES services(id),
  game_id UUID REFERENCES games(id),
  status order_status DEFAULT 'pending_payment',
  configuration JSONB NOT NULL,
  account_credentials_encrypted TEXT,
  subtotal DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  coupon_id UUID REFERENCES coupons(id),
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  worker_payout DECIMAL(10,2),
  worker_commission_rate DECIMAL(5,4),
  payout_hold_until TIMESTAMPTZ,
  paid_out_at TIMESTAMPTZ,
  payout_id UUID,
  progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  progress_notes TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_completion TIMESTAMPTZ,
  payment_method TEXT,
  payment_id TEXT,
  payment_status payment_status DEFAULT 'pending',
  referral_code_used TEXT,
  referral_credit DECIMAL(10,2) DEFAULT 0,
  affiliate_id UUID REFERENCES affiliates(id),
  affiliate_commission DECIMAL(10,2) DEFAULT 0,
  loyalty_points_earned INT DEFAULT 0,
  loyalty_points_used INT DEFAULT 0,
  loyalty_discount DECIMAL(10,2) DEFAULT 0,
  customer_notes TEXT,
  admin_notes TEXT,
  ip_address TEXT,
  user_agent TEXT,
  claimed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'BST-' || LPAD(nextval('order_number_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW WHEN (NEW.order_number = '')
  EXECUTE FUNCTION generate_order_number();

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- ORDER STATUS HISTORY
-- =============================================

CREATE TABLE order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  old_status order_status,
  new_status order_status NOT NULL,
  changed_by UUID REFERENCES profiles(id),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-log status changes
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_status_history (order_id, old_status, new_status)
    VALUES (NEW.id, OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_order_status_change
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION log_order_status_change();

-- =============================================
-- REVIEWS
-- =============================================

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID UNIQUE REFERENCES orders(id),
  customer_id UUID REFERENCES profiles(id),
  worker_id UUID REFERENCES workers(id),
  game_id UUID REFERENCES games(id),
  service_id UUID REFERENCES services(id),
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT TRUE,
  admin_response TEXT,
  helpful_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update worker average rating on new review
CREATE OR REPLACE FUNCTION update_worker_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE workers
  SET
    average_rating = (
      SELECT AVG(rating)::DECIMAL(3,2) FROM reviews
      WHERE worker_id = NEW.worker_id AND is_public = TRUE
    ),
    total_ratings = (
      SELECT COUNT(*) FROM reviews
      WHERE worker_id = NEW.worker_id AND is_public = TRUE
    )
  WHERE id = NEW.worker_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_review_created
  AFTER INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_worker_rating();
