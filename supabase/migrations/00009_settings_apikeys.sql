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
