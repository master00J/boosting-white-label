/**
 * Deep reference for the in-admin Setup AI coach.
 * Keep in sync with admin navigation and /admin/guide behaviour.
 */
export const ADMIN_SETUP_KNOWLEDGE = `
# BoostPlatform — Admin & setup reference (instance)

## Core URLs
- The assistant receives the shop's **canonical base URL** at runtime when known (from Site URL, custom domain, or deploy env). When present, answers should use **full https links** (\`base + /admin/...\`). Otherwise use paths only.
- Do not invent hostnames; use only the provided base or path-only fallback.
- **Admin panel:** /admin/dashboard (overview KPIs)
- **Static admin guide (human-readable):** /admin/guide — long-form documentation; use it together with this assistant.
- **Staff orders:** /admin/orders — filter, split (multi-item), release to queue, confirm gold, assign workers, refunds.
- **Catalog root:** /admin/games — games list; each game has **Setup** (skills + OSRS catalog tools), **Categories**, **Services**.
- **Workers:** /admin/workers, /admin/workers/applications, /admin/workers/tiers
- **Customers:** /admin/customers, /admin/customers/new-signups
- **Finance:** /admin/finance, /admin/finance/transactions, /admin/finance/payouts
- **Marketing:** coupons, affiliates, referrals, loyalty, lootboxes (+ deliveries)
- **Helpdesk:** /admin/helpdesk, /admin/helpdesk/settings (AI keys for customer tickets — separate from this Setup coach if configured there)
- **Content:** pages, banners, announcements
- **Storefront:** /admin/storefront/hero, /admin/storefront/theme
- **Discord:** /admin/discord — channel IDs for bot notifications (new orders, worker channel, admin alerts, reviews), ticket category, roles (customer/worker/admin). Bot runs as separate Node service with SUPABASE_SERVICE_ROLE_KEY.
- **Activity:** /admin/activity — audit-style log
- **Settings:** /admin/settings (general), …/payments, …/currency, …/notifications, …/security, …/email, …/integrations, …/chat-agents
- **Settings → API Keys** (/admin/settings/api-keys): UI placeholder (“coming soon”) — do **not** send users there for working AI key fields.
- **Helpdesk → AI & Settings** (/admin/helpdesk/settings): live form for **ai_api_key**, **ai_provider**, **ai_model** (ticket AI + falls back for platform AI when hosted keys are absent).
- **Import:** /admin/import — **bulk order CSV only** (past orders into the system). **Not** for importing games, quests, or catalog data.
- **Live chat:** /admin/chat
- **Ranks:** /admin/ranks (super_admin only) — granular admin permissions

## Recommended first-time setup order
1. **General settings** — site name, logo, URL, registration flags (/admin/settings).
2. **Payments** — enable Stripe/PayPal/balance/gold/Whop as needed; paste keys and webhooks (/admin/settings/payments). Without this, checkout fails.
3. **Currency & gold** — if using gold payments, configure rates (/admin/settings/currency).
4. **Discord** — set guild ID, bot token, channel IDs for notifications and ticket category (/admin/discord). Customers need Discord OAuth configured in Supabase Auth + Discord Developer app (external to this panel).
5. **Catalog** — create **Game** → for **OSRS**, use **Setup → Load OSRS catalog** first (see **OSRS — quests & catalog** below) → **Categories** → **Services** → pricing models.
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
- **Quest + stats:** uses quests already stored for the game (**game_quests**). You set per-quest base prices and stat multipliers on the **service** — you do **not** manually type every quest name to “create” the catalog if you used OSRS preload.

## OSRS — quests & catalog (important)
- **Wrong path:** Saying users must manually create a “Quests” category and type every quest first. **Right path:** bulk quest rows come from the built-in **OSRS catalog seed**, then you price them via a **Quest + stats** service.
- **Game slug:** Must match OSRS for full tooling: canonical slugs \`oldschool-runescape\` or \`osrs\`, or any slug containing \`oldschool\` or \`osrs\` (e.g. \`runescape-osrs\`). If the slug is wrong, edit the game under **Catalog → Games**.
- **Where:** **Admin → Games** → open your OSRS game → **Setup** (page title “Setup — [game name]”; URL pattern \`/admin/games/<gameId>/setup\` — users navigate via UI; do not guess IDs).
- **Load OSRS catalog:** Button **Load OSRS catalog** (top right, next to Add skill). Calls **POST /api/admin/games/[id]/preload-osrs-catalog**. **Idempotent** — safe to run again.
  - Imports: OSRS **skills**, **standard training methods**, **full quest list** into **game_quests**, **shared boss profiles** (global), **default service categories** when empty (**Skilling**, **Quests**, **Bossing**, **Minigames**), **starter placeholder services** (slug prefix \`osrs-seed-*\`, often **inactive** until you enable and set prices after configuring), **GP/XP pricing rows** where applicable.
- **After preload:** Open **Categories** and **Services** for that game (from Games → game → categories/services in the admin UI). Edit or replace starter services; set pricing model **Quest + stats** on the quest service you sell from; configure per-quest prices and multipliers there.
- **Quest required items (optional):** On the same **Setup** page, **Fetch quest items from Wiki** pulls wiki item requirements into the DB for **Bank / loadout** displays — this is **extra** metadata, **not** the main quest list import.
- **/admin/import** does **not** import quests — only CSV **orders**.

## Order number format
- [BRAND]-[GAME]-[SERVICE]-[SEQ]; brand in Settings → General (order_id); game/service **order_code** on game and service rows; sequence auto.

## Lootboxes / deliveries
- Marketing → Lootboxes; deliveries queue for in-game item fulfilment — configure there.

## Helpdesk AI vs Setup coach
- **Helpdesk → AI & Settings** (/admin/helpdesk/settings) is the live UI for **ai_api_key**, **ai_provider**, **ai_model** (tickets + shared fallback for platform AI).
- Setup coach resolves keys: shop-specific **openai_api_key** / **anthropic_api_key** in DB if present, else **legacy ai_api_key**, else **hosted** env from deploy.

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
- **Hosted:** Many deployments inject platform keys via server env (\`BOOST_PLATFORM_HOSTED_AI_*\`); shops do not need their own key for Setup Assistant.
- **Optional override (UI):** **Helpdesk → AI & Settings** (\`/admin/helpdesk/settings\`) — **ai_api_key**, **ai_provider**, **ai_model** in \`site_settings\` (shared with ticket AI; also used as fallback for platform AI).
- **Dedicated API Keys settings page** (\`/admin/settings/api-keys\`) is a placeholder only — tell users to use Helpdesk → AI & Settings instead until that page ships.
- Never ask users to paste secrets into this chat.

## Security & honesty rules for answers
- Never invent credentials; never ask users to paste secrets in Discord #public channels.
- If a feature depends on env vars on Vercel (e.g. NEXT_PUBLIC_*), mention “deployment environment” generically.
- Prefer exact paths like /admin/settings/payments so users can click sidebar equivalents.

## Language
- Always answer in **English**.
`;
