/**
 * PATCH allowlist per table — voorkomt mass assignment.
 * Alleen whitelisted kolommen worden geaccepteerd voor updates.
 */

export const TABLE_PATCH_ALLOWLIST: Record<string, string[]> = {
  service_categories: ["name", "slug", "icon", "image_url", "sort_order", "is_active", "game_id", "created_at"],
  services: [
    "name", "slug", "order_code", "description", "base_price", "price_per_unit", "category_id", "game_id",
    "image_url", "sort_order", "is_active", "is_featured", "min_quantity", "max_quantity",
    "estimated_hours", "price_matrix", "form_config", "min_worker_tier_id", "worker_payout_override",
    "meta_title", "meta_description", "updated_at", "created_at",
  ],
  worker_tiers: [
    "name", "slug", "color", "icon", "sort_order", "commission_rate", "discord_role_id",
    "is_default", "is_invite_only", "min_completed_orders", "min_rating", "min_deposit",
    "max_active_orders", "updated_at", "created_at",
  ],
  workers: [
    "profile_id", "tier_id", "bio", "profile_photo_url", "is_active", "is_verified",
    "show_on_boosters_page", "games", "notes", "application_text", "payout_method",
    "payout_minimum", "commission_rate", "max_active_orders", "verified_at", "applied_at",
    "updated_at", "created_at",
  ],
  // role + is_banned via aparte check (alleen super_admin) — expliciet in allowlist voor die flow
  profiles: [
    "display_name", "avatar_url", "balance", "email", "discord_id", "discord_username", "discord_linked_at",
    "referral_code", "referred_by", "total_spent", "role", "admin_rank_id", "is_banned", "ban_reason",
    "last_login_at", "last_login_ip", "updated_at", "created_at",
  ],
  site_settings: ["key", "value", "updated_at", "updated_by"],
  announcements: ["title", "content", "type", "is_active", "created_at"],
  static_pages: ["slug", "title", "content", "is_published", "updated_at"],
  promo_banners: ["title", "message", "bg_color", "image_url", "cta_text", "cta_url", "starts_at", "ends_at", "is_active", "created_at"],
  game_skills: ["name", "slug", "icon", "game_id", "sort_order", "created_at"],
  game_service_methods: ["name", "slug", "skill_id", "sort_order", "created_at"],
  affiliates: [
    "profile_id", "affiliate_code", "company_name", "website_url", "is_active",
    "commission_rate", "cookie_days", "notes", "approved_at", "approved_by",
    "updated_at", "created_at",
  ],
  loyalty_tiers: [
    "name", "slug", "color", "icon", "sort_order", "min_lifetime_points",
    "bonus_multiplier", "perks", "is_default", "created_at",
  ],
};

export function filterPatchBody(table: string, body: Record<string, unknown>): Record<string, unknown> {
  const allowed = TABLE_PATCH_ALLOWLIST[table];
  if (!allowed) return {};
  const filtered: Record<string, unknown> = {};
  for (const key of Object.keys(body)) {
    if (allowed.includes(key)) {
      filtered[key] = body[key];
    }
  }
  return filtered;
}
