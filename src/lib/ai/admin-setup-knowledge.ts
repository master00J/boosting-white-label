/**
 * Deep reference for the in-admin Setup AI coach.
 * Keep in sync with admin navigation and /admin/guide behaviour.
 */
export const ADMIN_SETUP_KNOWLEDGE = `
# BoostPlatform — Admin & setup reference (instance)

## Core URLs (relative to your shop domain)
- **Admin panel:** /admin/dashboard (overview KPIs)
- **Static admin guide (human-readable):** /admin/guide — long-form documentation; use it together with this assistant.
- **Staff orders:** /admin/orders — filter, split (multi-item), release to queue, confirm gold, assign workers, refunds.
- **Catalog root:** /admin/games — games list; each game has setup (skills, methods), categories, services.
- **Workers:** /admin/workers, /admin/workers/applications, /admin/workers/tiers
- **Customers:** /admin/customers, /admin/customers/new-signups
- **Finance:** /admin/finance, /admin/finance/transactions, /admin/finance/payouts
- **Marketing:** coupons, affiliates, referrals, loyalty, lootboxes (+ deliveries)
- **Helpdesk:** /admin/helpdesk, /admin/helpdesk/settings (AI keys for customer tickets — separate from this Setup coach if configured there)
- **Content:** pages, banners, announcements
- **Storefront:** /admin/storefront/hero, /admin/storefront/theme
- **Discord:** /admin/discord — channel IDs for bot notifications (new orders, worker channel, admin alerts, reviews), ticket category, roles (customer/worker/admin). Bot runs as separate Node service with SUPABASE_SERVICE_ROLE_KEY.
- **Activity:** /admin/activity — audit-style log
- **Settings:** /admin/settings (general), …/payments, …/currency, …/api-keys (**OpenAI + Anthropic keys + ai_provider + ai_model** for platform AI features), …/notifications, …/security, …/email, …/integrations, …/chat-agents
- **Import:** /admin/import
- **Live chat:** /admin/chat
- **Ranks:** /admin/ranks (super_admin only) — granular admin permissions

## Recommended first-time setup order
1. **General settings** — site name, logo, URL, registration flags (/admin/settings).
2. **Payments** — enable Stripe/PayPal/balance/gold/Whop as needed; paste keys and webhooks (/admin/settings/payments). Without this, checkout fails.
3. **Currency & gold** — if using gold payments, configure rates (/admin/settings/currency).
4. **Discord** — set guild ID, bot token, channel IDs for notifications and ticket category (/admin/discord). Customers need Discord OAuth configured in Supabase Auth + Discord Developer app (external to this panel).
5. **Catalog** — create **Game** → game setup (skills/methods if OSRS-style) → **Categories** → **Services** under categories → pricing (fixed, matrix, per-unit, quests, bosses, etc.).
6. **Workers** — tiers (commission, limits), approve applications, assign tiers.
7. **Storefront** — hero banners, theme colours/fonts (/admin/storefront).
8. **Orders workflow** — paid orders may need admin **split** then **release to queue**; workers claim via web or Discord bot; deposits / min tier / account_value may block claims.
9. **Marketing** — coupons, loyalty, lootboxes when ready.

## Orders — concepts
- Status flow typical: pending_payment → paid → (optional split parent) → queued → claimed → in_progress → completed (or cancelled/refunded).
- **Split:** multi-item orders can be split into child orders with separate order_numbers (admin API / UI).
- **Gold payment:** often needs admin “gold received” → paid, then queue release.
- **Discord ticket:** order may have discord_ticket_channel_id; bot creates private channels when customer has discord linked.
- Order detail (/admin/orders/[id]): status changes, assign worker, internal notes, timeline, split/release, gold confirm, messages to customer.

## Order statuses (admin)
- pending_payment, paid, queued, claimed, in_progress, paused, completed, cancelled, disputed, refunded; **split** marks a parent order that was divided into child orders.

## Pricing models (one active model per service)
- **XP based:** skills, level ranges, $/XP, OSRS/RS3 XP table; optional methods (multiplier or $/XP override); tier modifier dropdowns (fish type, ore, etc.).
- **Per item:** discrete SKUs (fire cape, drops) with fixed USD each; optional quantity.
- **Per unit:** kill/run/hour/point with price per unit, min/max/presets.
- **Boss tiered:** KC tiers with decreasing $/kill; optional combat-based discounts.
- **Stat based:** Inferno-style — stats and gear affect multiplier from base price.
- **Quest + stats:** quest list with base prices + stat multipliers.

## Order number format
- [BRAND]-[GAME]-[SERVICE]-[SEQ]; brand in Settings → General (order_id); game/service **order_code** on game and service rows; sequence auto.

## Lootboxes / deliveries
- Marketing → Lootboxes; deliveries queue for in-game item fulfilment — configure there.

## Helpdesk AI vs Setup coach
- Helpdesk AI (/admin/helpdesk/settings) uses ai_api_key legacy field for ticket auto-replies.
- Setup coach uses resolved keys from openai_api_key / anthropic_api_key when set (see Settings → API Keys).

## Workers / boosters
- Applications reviewed under Workers → Applications.
- **Tiers** control max concurrent orders, commission %, deposit requirements, visibility of high-tier services.
- Worker dashboards live under **/booster/** routes (not /admin).

## Payments (detail)
- Stripe: publishable + secret + webhook endpoint on your domain (/api/webhooks/stripe or similar — follow admin hints).
- Balance / wallet top-ups if enabled.
- **Gold:** manual confirmation flow from admin order detail.

## Discord bot (hosted separately)
- Reads channel IDs from site_settings keys: discord_channel_new_orders, discord_channel_worker_notifications, discord_channel_admin_alerts, discord_category_tickets, discord_role_* , etc.
- Uses Supabase service role for DB + realtime.
- Slash/commands: claim, progress, etc. — workers must link Discord on the **same** shop profile.

## AI configuration for THIS assistant
- Keys live in **Admin → Settings → API Keys**: openai_api_key and/or anthropic_api_key, plus ai_provider (openai | anthropic) and ai_model.
- Legacy single field **ai_api_key** (Helpdesk settings) still works as fallback if provider-specific keys are empty.
- You cannot read keys back in chat; only guide where to paste them.

## Security & honesty rules for answers
- Never invent credentials; never ask users to paste secrets in Discord #public channels.
- If a feature depends on env vars on Vercel (e.g. NEXT_PUBLIC_*), mention “deployment environment” generically.
- Prefer exact paths like /admin/settings/payments so users can click sidebar equivalents.

## Language
- Always answer in **English**.
`;
