-- =============================================
-- ENUMS
-- =============================================

CREATE TYPE user_role AS ENUM ('customer', 'worker', 'admin', 'super_admin');

CREATE TYPE order_status AS ENUM (
  'pending_payment',
  'paid',
  'queued',
  'claimed',
  'in_progress',
  'paused',
  'completed',
  'cancelled',
  'refunded',
  'disputed'
);

CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

CREATE TYPE payout_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- NOTE: service_type is NOT an enum — categories are dynamic via service_categories table.
-- NOTE: worker tier is NOT an enum — tiers are dynamic via worker_tiers table.

CREATE TYPE discount_type AS ENUM ('percentage', 'fixed');

CREATE TYPE ticket_status AS ENUM ('open', 'awaiting_reply', 'in_progress', 'resolved', 'closed');

CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
-- =============================================
-- PROFILES (extends Supabase Auth)
-- =============================================

-- nanoid extension for referral codes
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION nanoid(size int DEFAULT 8)
RETURNS TEXT AS $$
DECLARE
  alphabet TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  id TEXT := '';
  i INT := 0;
  byte_val INT;
BEGIN
  WHILE i < size LOOP
    byte_val := (get_byte(gen_random_bytes(1), 0) % length(alphabet)) + 1;
    id := id || substr(alphabet, byte_val, 1);
    i := i + 1;
  END LOOP;
  RETURN id;
END;
$$ LANGUAGE plpgsql VOLATILE;

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role DEFAULT 'customer',
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  discord_id TEXT UNIQUE,
  discord_username TEXT,
  discord_linked_at TIMESTAMPTZ,
  referral_code TEXT UNIQUE DEFAULT nanoid(8),
  referred_by UUID REFERENCES profiles(id),
  balance DECIMAL(10,2) DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret TEXT,
  last_login_at TIMESTAMPTZ,
  last_login_ip TEXT,
  is_banned BOOLEAN DEFAULT FALSE,
  ban_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, referred_by)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    (
      SELECT id FROM public.profiles
      WHERE referral_code = NEW.raw_user_meta_data->>'referral_code'
      LIMIT 1
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
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
-- =============================================
-- GAMES
-- =============================================

CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  short_description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  icon_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  meta_title TEXT,
  meta_description TEXT,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- SERVICE CATEGORIES (fully dynamic, admin-defined)
-- =============================================

CREATE TABLE service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SERVICES (per game)
-- =============================================

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  category_id UUID REFERENCES service_categories(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  base_price DECIMAL(10,2) NOT NULL,
  price_per_unit DECIMAL(10,2),
  min_quantity INT DEFAULT 1,
  max_quantity INT,
  form_config JSONB DEFAULT '[]',
  price_matrix JSONB,
  min_worker_tier_id UUID REFERENCES worker_tiers(id),
  estimated_hours DECIMAL(6,2),
  worker_payout_override DECIMAL(5,4),
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, slug)
);

CREATE TRIGGER services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
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
-- =============================================
-- ORDER MESSAGES
-- =============================================

CREATE TABLE order_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id),
  content TEXT NOT NULL,
  is_system BOOLEAN DEFAULT FALSE,
  attachments JSONB DEFAULT '[]',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- NOTIFICATIONS (in-app)
-- =============================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- =============================================
-- WORKER PAYOUTS
-- =============================================

CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES workers(id),
  affiliate_id UUID REFERENCES affiliates(id),
  amount DECIMAL(10,2) NOT NULL,
  method TEXT NOT NULL,
  status payout_status DEFAULT 'pending',
  transaction_id TEXT,
  notes TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- REFERRAL REWARDS
-- =============================================

CREATE TABLE referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES profiles(id),
  referred_id UUID REFERENCES profiles(id),
  order_id UUID REFERENCES orders(id),
  reward_amount DECIMAL(10,2) NOT NULL,
  referred_reward DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'credited', 'expired')),
  credited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- AFFILIATE CLICKS & CONVERSIONS
-- =============================================

CREATE TABLE affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  referrer_url TEXT,
  landing_page TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE affiliate_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES affiliates(id),
  order_id UUID REFERENCES orders(id),
  commission_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- =============================================
-- LOYALTY PROGRAM
-- =============================================

CREATE TABLE loyalty_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT '⭐',
  min_lifetime_points INT DEFAULT 0,
  bonus_multiplier DECIMAL(3,2) DEFAULT 1.00,
  perks TEXT,
  sort_order INT DEFAULT 0,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_loyalty_tiers_default ON loyalty_tiers (is_default) WHERE is_default = TRUE;

CREATE TABLE loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  points INT DEFAULT 0,
  lifetime_points INT DEFAULT 0,
  tier_id UUID REFERENCES loyalty_tiers(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER loyalty_points_updated_at
  BEFORE UPDATE ON loyalty_points
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id),
  points INT NOT NULL,
  reason TEXT NOT NULL,
  reference_id UUID,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  points_cost INT NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('discount_percentage', 'discount_fixed', 'free_addon')),
  reward_value DECIMAL(10,2) NOT NULL,
  max_redemptions INT,
  current_redemptions INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- =============================================
-- SITE SETTINGS
-- =============================================

CREATE TABLE site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO site_settings (key, value) VALUES
  ('general', '{
    "site_name": "BoostPlatform",
    "site_description": "Professional Game Boosting Services",
    "support_email": "support@example.com",
    "currency": "EUR",
    "currency_symbol": "€",
    "tax_rate": 0,
    "min_order_amount": 5.00,
    "order_expiry_hours": 24,
    "payout_review_window_hours": 48
  }'),
  ('theme', '{
    "primary_color": "#6366f1",
    "secondary_color": "#8b5cf6",
    "accent_color": "#f59e0b",
    "success_color": "#22c55e",
    "dark_mode": true,
    "font_heading": "Cal Sans",
    "font_body": "Satoshi",
    "border_radius": "0.5rem",
    "logo_url": "",
    "favicon_url": "",
    "hero_title": "Level Up Without the Grind",
    "hero_subtitle": "Professional boosting services for your favorite games",
    "hero_cta_text": "Browse Services",
    "hero_bg_url": "",
    "hero_bg_overlay": 0.6
  }'),
  ('homepage_sections', '{
    "sections": [
      { "id": "hero", "enabled": true, "order": 0 },
      { "id": "featured_games", "enabled": true, "order": 1 },
      { "id": "how_it_works", "enabled": true, "order": 2 },
      { "id": "reviews", "enabled": true, "order": 3 },
      { "id": "trust_badges", "enabled": true, "order": 4 },
      { "id": "faq_preview", "enabled": true, "order": 5 },
      { "id": "cta", "enabled": true, "order": 6 }
    ]
  }'),
  ('payments', '{
    "stripe_enabled": false,
    "stripe_public_key": "",
    "paypal_enabled": false,
    "paypal_client_id": "",
    "balance_enabled": true
  }'),
  ('discord', '{
    "enabled": false,
    "guild_id": "",
    "bot_token_encrypted": "",
    "channels": {
      "new_orders": "",
      "order_updates": "",
      "completed_orders": "",
      "worker_chat": "",
      "admin_logs": "",
      "reviews": ""
    },
    "roles": { "customer": "" },
    "notify_new_order": true,
    "notify_order_claimed": true,
    "notify_order_completed": true,
    "notify_new_review": true
  }'),
  ('referrals', '{
    "enabled": true,
    "reward_type": "percentage",
    "reward_value": 5,
    "min_order_for_reward": 10.00,
    "reward_for_referred": 5
  }'),
  ('loyalty', '{
    "enabled": true,
    "points_per_euro": 10,
    "point_value_euros": 0.01,
    "min_redeem_points": 500,
    "max_discount_percentage": 20,
    "points_expiry_days": 365
  }'),
  ('helpdesk', '{
    "ai_enabled": false,
    "ai_provider": "anthropic",
    "ai_model": "claude-haiku-4-5-20251001",
    "ai_api_key_encrypted": "",
    "ai_auto_respond": false,
    "ai_confidence_threshold": 0.85,
    "ai_system_prompt": "You are a helpful support agent for a game boosting service. Be professional, friendly, and concise.",
    "sla_first_response_hours": 4,
    "sla_resolution_hours": 24,
    "canned_responses": []
  }'),
  ('worker_settings', '{
    "auto_promote_enabled": true,
    "auto_promote_check_interval": "weekly",
    "require_min_rating_for_promote": true,
    "allow_self_demotion": false,
    "show_public_leaderboard": true,
    "leaderboard_min_orders": 5
  }'),
  ('notifications', '{
    "email_order_confirmed": true,
    "email_order_assigned": true,
    "email_order_in_progress": true,
    "email_order_completed": true,
    "email_payout_sent": true,
    "email_ticket_response": true,
    "email_worker_approved": true
  }'),
  ('security', '{
    "require_2fa_admin": false,
    "ip_whitelist_admin": [],
    "max_login_attempts": 5,
    "lockout_duration_minutes": 30,
    "session_timeout_hours": 24,
    "require_email_verification": true
  }');

-- =============================================
-- API KEYS
-- =============================================

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  permissions JSONB DEFAULT '["read:orders","read:games"]',
  rate_limit INT DEFAULT 100,
  last_used_at TIMESTAMPTZ,
  usage_count INT DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- =============================================
-- ACTIVITY LOG (full audit trail)
-- =============================================

CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- =============================================
-- HELPDESK TICKETS
-- =============================================

CREATE SEQUENCE ticket_number_seq START 1;

CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL DEFAULT '',
  customer_id UUID REFERENCES profiles(id),
  assigned_to UUID REFERENCES profiles(id),
  order_id UUID REFERENCES orders(id),
  subject TEXT NOT NULL,
  status ticket_status DEFAULT 'open',
  priority ticket_priority DEFAULT 'medium',
  category TEXT,
  is_ai_handled BOOLEAN DEFAULT FALSE,
  ai_confidence DECIMAL(3,2),
  resolved_at TIMESTAMPTZ,
  first_response_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_number := 'TKT-' || LPAD(nextval('ticket_number_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_ticket_number
  BEFORE INSERT ON tickets
  FOR EACH ROW WHEN (NEW.ticket_number = '')
  EXECUTE FUNCTION generate_ticket_number();

CREATE TRIGGER tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id),
  content TEXT NOT NULL,
  is_ai_generated BOOLEAN DEFAULT FALSE,
  is_internal_note BOOLEAN DEFAULT FALSE,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT role IN ('admin', 'super_admin') FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: is worker
CREATE OR REPLACE FUNCTION is_worker()
RETURNS BOOLEAN AS $$
  SELECT role IN ('worker', 'admin', 'super_admin') FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── PROFILES ───
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (is_admin());

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can update any profile" ON profiles
  FOR UPDATE USING (is_admin());

-- ─── WORKER TIERS ───
CREATE POLICY "Anyone can view worker tiers" ON worker_tiers
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage worker tiers" ON worker_tiers
  FOR ALL USING (is_admin());

-- ─── WORKERS ───
CREATE POLICY "Workers can view own record" ON workers
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Admins can view all workers" ON workers
  FOR SELECT USING (is_admin());

CREATE POLICY "Public can view verified active workers" ON workers
  FOR SELECT USING (is_verified = true AND is_active = true);

CREATE POLICY "Workers can update own record" ON workers
  FOR UPDATE USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Admins can manage all workers" ON workers
  FOR ALL USING (is_admin());

-- ─── GAMES ───
CREATE POLICY "Anyone can view active games" ON games
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can view all games" ON games
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can manage games" ON games
  FOR ALL USING (is_admin());

-- ─── SERVICE CATEGORIES ───
CREATE POLICY "Anyone can view active categories" ON service_categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage categories" ON service_categories
  FOR ALL USING (is_admin());

-- ─── SERVICES ───
CREATE POLICY "Anyone can view active services" ON services
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can view all services" ON services
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can manage services" ON services
  FOR ALL USING (is_admin());

-- ─── ORDERS ───
CREATE POLICY "Customers can view own orders" ON orders
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Workers can view claimed orders" ON orders
  FOR SELECT USING (
    worker_id IN (SELECT id FROM workers WHERE profile_id = auth.uid())
  );

CREATE POLICY "Workers can view available orders" ON orders
  FOR SELECT USING (
    status IN ('queued') AND is_worker()
  );

CREATE POLICY "Admins can view all orders" ON orders
  FOR SELECT USING (is_admin());

CREATE POLICY "Customers can create orders" ON orders
  FOR INSERT WITH CHECK (customer_id = auth.uid() OR customer_id IS NULL);

CREATE POLICY "Workers can update claimed orders" ON orders
  FOR UPDATE USING (
    worker_id IN (SELECT id FROM workers WHERE profile_id = auth.uid())
  );

CREATE POLICY "Admins can manage all orders" ON orders
  FOR ALL USING (is_admin());

-- ─── ORDER MESSAGES ───
CREATE POLICY "Order participants can view messages" ON order_messages
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders
      WHERE customer_id = auth.uid()
         OR worker_id IN (SELECT id FROM workers WHERE profile_id = auth.uid())
    )
    OR is_admin()
  );

CREATE POLICY "Order participants can send messages" ON order_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    order_id IN (
      SELECT id FROM orders
      WHERE customer_id = auth.uid()
         OR worker_id IN (SELECT id FROM workers WHERE profile_id = auth.uid())
    )
    OR is_admin()
  );

-- ─── REVIEWS ───
CREATE POLICY "Anyone can view public reviews" ON reviews
  FOR SELECT USING (is_public = true);

CREATE POLICY "Admins can view all reviews" ON reviews
  FOR SELECT USING (is_admin());

CREATE POLICY "Customers can create reviews for own orders" ON reviews
  FOR INSERT WITH CHECK (
    customer_id = auth.uid() AND
    order_id IN (SELECT id FROM orders WHERE customer_id = auth.uid() AND status = 'completed')
  );

CREATE POLICY "Admins can manage reviews" ON reviews
  FOR ALL USING (is_admin());

-- ─── NOTIFICATIONS ───
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (profile_id = auth.uid());

-- ─── SITE SETTINGS ───
CREATE POLICY "Anyone can read site settings" ON site_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins can update site settings" ON site_settings
  FOR UPDATE USING (is_admin());

-- ─── TICKETS ───
CREATE POLICY "Customers can view own tickets" ON tickets
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Admins can view all tickets" ON tickets
  FOR SELECT USING (is_admin());

CREATE POLICY "Customers can create tickets" ON tickets
  FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Admins can manage tickets" ON tickets
  FOR ALL USING (is_admin());

-- ─── TICKET MESSAGES ───
CREATE POLICY "Ticket participants can view messages" ON ticket_messages
  FOR SELECT USING (
    ticket_id IN (SELECT id FROM tickets WHERE customer_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY "Ticket participants can send messages" ON ticket_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND (
      ticket_id IN (SELECT id FROM tickets WHERE customer_id = auth.uid())
      OR is_admin()
    )
  );

-- ─── PAYOUTS ───
CREATE POLICY "Workers can view own payouts" ON payouts
  FOR SELECT USING (
    worker_id IN (SELECT id FROM workers WHERE profile_id = auth.uid())
  );

CREATE POLICY "Admins can manage payouts" ON payouts
  FOR ALL USING (is_admin());

-- ─── LOYALTY ───
CREATE POLICY "Users can view own loyalty points" ON loyalty_points
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Anyone can view loyalty tiers" ON loyalty_tiers
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view active rewards" ON loyalty_rewards
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage loyalty" ON loyalty_tiers
  FOR ALL USING (is_admin());

CREATE POLICY "Admins can manage rewards" ON loyalty_rewards
  FOR ALL USING (is_admin());

-- ─── ACTIVITY LOG ───
CREATE POLICY "Admins can view activity log" ON activity_log
  FOR SELECT USING (is_admin());

-- ─── API KEYS ───
CREATE POLICY "Admins can manage API keys" ON api_keys
  FOR ALL USING (is_admin());

-- ─── COUPONS ───
CREATE POLICY "Anyone can view active coupons" ON coupons
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage coupons" ON coupons
  FOR ALL USING (is_admin());

-- ─── AFFILIATES ───
CREATE POLICY "Affiliates can view own record" ON affiliates
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Admins can manage affiliates" ON affiliates
  FOR ALL USING (is_admin());
-- =============================================
-- PERFORMANCE INDEXES
-- =============================================

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_discord ON profiles(discord_id);
CREATE INDEX idx_profiles_referral ON profiles(referral_code);

CREATE INDEX idx_workers_tier ON workers(tier_id);
CREATE INDEX idx_workers_active ON workers(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_workers_profile ON workers(profile_id);

CREATE INDEX idx_games_slug ON games(slug);
CREATE INDEX idx_games_active ON games(is_active) WHERE is_active = TRUE;

CREATE INDEX idx_services_game ON services(game_id);
CREATE INDEX idx_services_category ON services(category_id);
CREATE INDEX idx_services_active ON services(is_active) WHERE is_active = TRUE;

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_worker ON orders(worker_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_game ON orders(game_id);
CREATE INDEX idx_orders_track_token ON orders(track_token);

CREATE INDEX idx_messages_order ON order_messages(order_id);

CREATE INDEX idx_reviews_worker ON reviews(worker_id);
CREATE INDEX idx_reviews_game ON reviews(game_id);
CREATE INDEX idx_reviews_public ON reviews(is_public) WHERE is_public = TRUE;

CREATE INDEX idx_coupons_code ON coupons(code);

CREATE INDEX idx_tickets_customer ON tickets(customer_id);
CREATE INDEX idx_tickets_status ON tickets(status);

CREATE INDEX idx_notifications_profile ON notifications(profile_id);
CREATE INDEX idx_notifications_unread ON notifications(profile_id) WHERE is_read = FALSE;

CREATE INDEX idx_activity_actor ON activity_log(actor_id);
CREATE INDEX idx_activity_created ON activity_log(created_at DESC);

CREATE INDEX idx_affiliate_clicks_affiliate ON affiliate_clicks(affiliate_id);

CREATE INDEX idx_loyalty_profile ON loyalty_points(profile_id);
CREATE INDEX idx_loyalty_tier ON loyalty_points(tier_id);

CREATE INDEX idx_payouts_worker ON payouts(worker_id);
CREATE INDEX idx_payouts_status ON payouts(status);
-- Cron job execution logs
CREATE TABLE IF NOT EXISTS cron_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name    TEXT NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('success', 'error', 'partial')),
  processed   INTEGER NOT NULL DEFAULT 0,
  errors      INTEGER NOT NULL DEFAULT 0,
  message     TEXT NOT NULL DEFAULT '',
  details     JSONB,
  ran_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cron_logs_job_name_idx ON cron_logs (job_name, ran_at DESC);
CREATE INDEX IF NOT EXISTS cron_logs_ran_at_idx ON cron_logs (ran_at DESC);

ALTER TABLE cron_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cron_logs_admin_read" ON cron_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- loyalty_transactions and loyalty_tiers already exist from 00008_marketing.sql
-- Add extra indexes for cron queries
CREATE INDEX IF NOT EXISTS loyalty_tx_profile_idx ON loyalty_transactions (profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS loyalty_tx_expires_idx ON loyalty_transactions (expires_at) WHERE expires_at IS NOT NULL;

-- Promo banners table
CREATE TABLE IF NOT EXISTS promo_banners (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  cta_text   TEXT,
  cta_url    TEXT,
  bg_color   TEXT NOT NULL DEFAULT '#6366f1',
  is_active  BOOLEAN NOT NULL DEFAULT true,
  starts_at  TIMESTAMPTZ,
  ends_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE promo_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "banners_public_read" ON promo_banners
  FOR SELECT USING (is_active = true);

CREATE POLICY "banners_admin_all" ON promo_banners
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'maintenance')),
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "announcements_public_read" ON announcements
  FOR SELECT USING (is_active = true);

CREATE POLICY "announcements_admin_all" ON announcements
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Static pages table
CREATE TABLE IF NOT EXISTS static_pages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL,
  content      TEXT NOT NULL DEFAULT '',
  is_published BOOLEAN NOT NULL DEFAULT true,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE static_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "static_pages_public_read" ON static_pages
  FOR SELECT USING (is_published = true);

CREATE POLICY "static_pages_admin_all" ON static_pages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- coupons table already created in 00005_orders.sql
-- coupons RLS already set in 00014_rls_policies.sql

-- =============================================
-- 00018: MULTI-CURRENCY & GOLD PAYMENT
-- =============================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS gold_amount BIGINT,
  ADD COLUMN IF NOT EXISTS gold_received BOOLEAN DEFAULT false;

ALTER TABLE orders ALTER COLUMN currency SET DEFAULT 'USD';

INSERT INTO site_settings (key, value)
VALUES (
  'currency_rates',
  '{
    "usd_eur_rate": 0.92,
    "games": {}
  }'
)
ON CONFLICT (key) DO NOTHING;

UPDATE site_settings
SET value = value || '{"currency": "USD", "currency_symbol": "$"}'
WHERE key = 'general';

UPDATE site_settings
SET value = value || '{"gold_enabled": false}'
WHERE key = 'payments';

-- =============================================
-- 00019: ORDERS SERVICE ROLE POLICY
-- =============================================

DROP POLICY IF EXISTS "Customers can create orders" ON orders;

CREATE POLICY "Customers can create orders" ON orders
  FOR INSERT WITH CHECK (
    customer_id = auth.uid()
  );

-- =============================================
-- 00020: GRANT SERVICE ROLE
-- =============================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

-- =============================================
-- 00021: ORDERS PROGRESS CURRENT
-- =============================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS progress_current INTEGER;

-- =============================================
-- 00022: INTEGRATIONS SETTINGS
-- =============================================

INSERT INTO site_settings (key, value)
VALUES (
  'integrations',
  '{
    "tawkto_enabled": false,
    "tawkto_property_id": "",
    "tawkto_widget_id": "default"
  }'
)
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- 00023: FIX ORDER MESSAGES RLS
-- =============================================

DROP POLICY IF EXISTS "Order participants can send messages" ON order_messages;

CREATE POLICY "Order participants can send messages" ON order_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND (
      order_id IN (
        SELECT id FROM orders
        WHERE customer_id = auth.uid()
           OR worker_id IN (SELECT id FROM workers WHERE profile_id = auth.uid())
      )
      OR is_admin()
    )
  );

-- =============================================
-- 00025: AFFILIATES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE REFERENCES profiles(id),
  company_name TEXT,
  website_url TEXT,
  affiliate_code TEXT UNIQUE NOT NULL DEFAULT substr(md5(random()::text), 1, 10),
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

CREATE OR REPLACE FUNCTION update_updated_at_affiliates()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS affiliates_updated_at ON affiliates;
CREATE TRIGGER affiliates_updated_at
  BEFORE UPDATE ON affiliates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_affiliates();

ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Affiliates can view own record" ON affiliates;
CREATE POLICY "Affiliates can view own record" ON affiliates
  FOR SELECT USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage affiliates" ON affiliates;
CREATE POLICY "Admins can manage affiliates" ON affiliates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- =============================================
-- 00025: AFFILIATE CLICKS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  landed_at TIMESTAMPTZ DEFAULT NOW(),
  converted BOOLEAN DEFAULT FALSE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL
);

ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage affiliate clicks" ON affiliate_clicks;
CREATE POLICY "Admins can manage affiliate clicks" ON affiliate_clicks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- =============================================
-- 00026: ORDERS AFFILIATE COLUMNS
-- =============================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS affiliate_id UUID REFERENCES affiliates(id),
  ADD COLUMN IF NOT EXISTS affiliate_commission DECIMAL(10,2) DEFAULT 0;

-- =============================================
-- 00027: ORDERS MULTI-ITEM (1 order per cart)
-- =============================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS items JSONB,
  ADD COLUMN IF NOT EXISTS item_count INT DEFAULT 1;

-- Make service_id and game_id nullable for multi-item orders
ALTER TABLE orders
  ALTER COLUMN service_id DROP NOT NULL,
  ALTER COLUMN game_id DROP NOT NULL;

-- =============================================
-- 00028: ATOMIC PAYMENT PROCESSING RPC
-- =============================================

CREATE OR REPLACE FUNCTION process_payment(
  p_order_ids    UUID[],
  p_payment_id   TEXT DEFAULT NULL,
  p_affiliate_id UUID DEFAULT NULL,
  p_commission   NUMERIC DEFAULT 0,
  p_customer_id  UUID DEFAULT NULL,
  p_total_spent  NUMERIC DEFAULT 0
) RETURNS VOID AS $$
BEGIN
  IF current_setting('request.jwt.claims', true)::jsonb->>'role' != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized: only service role can call process_payment';
  END IF;

  UPDATE orders
  SET
    status         = 'paid',
    payment_status = 'completed',
    payment_id     = COALESCE(p_payment_id, payment_id)
  WHERE id = ANY(p_order_ids);

  IF p_affiliate_id IS NOT NULL AND p_commission > 0 THEN
    UPDATE affiliates
    SET
      total_conversions = total_conversions + 1,
      total_earned      = total_earned + p_commission,
      pending_balance   = pending_balance + p_commission
    WHERE id = p_affiliate_id;
  END IF;

  IF p_customer_id IS NOT NULL AND p_total_spent > 0 THEN
    UPDATE profiles
    SET total_spent = total_spent + p_total_spent
    WHERE id = p_customer_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Migration 00029: Order split support
-- ============================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS parent_order_id UUID REFERENCES orders(id),
  ADD COLUMN IF NOT EXISTS is_split BOOLEAN DEFAULT false;

ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'split';

-- ============================================================
-- Migration 00033: Discord ticket channel ID on orders
-- ============================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS discord_ticket_channel_id TEXT;

-- ============================================================
-- Migration 00032: Order reviews
-- ============================================================

CREATE TABLE IF NOT EXISTS order_reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  reviewer_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating        SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT,
  is_public     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS order_reviews_order_id_idx ON order_reviews(order_id);
CREATE INDEX IF NOT EXISTS order_reviews_reviewer_id_idx ON order_reviews(reviewer_id);

ALTER TABLE order_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customer can create review"
  ON order_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_id
        AND orders.customer_id = auth.uid()
        AND orders.status = 'completed'
    )
  );

CREATE POLICY "Customer can read own reviews"
  ON order_reviews FOR SELECT
  TO authenticated
  USING (reviewer_id = auth.uid());

CREATE POLICY "Public reviews are visible"
  ON order_reviews FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

CREATE POLICY "Admins can read all reviews"
  ON order_reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update reviews"
  ON order_reviews FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Service role full access on order_reviews"
  ON order_reviews FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
