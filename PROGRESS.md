# BoostPlatform — Build Progress Tracker

> This file is maintained by Cursor AI. Every new chat should read this first before continuing.
> **Project folder:** `c:\Users\RTX40\Desktop\Jason\coding stuff\boosting\`
> **Live URL:** https://boosting-self.vercel.app
> **GitHub:** Set this to the white-label template repository used by CodeCraft deployments.

---

## Overview

| Step | Name | Status | Completed |
|------|------|--------|-----------|
| 1 | Foundation | ✅ Done | 2026-02-27 |
| 2 | Admin Core | ✅ Done | 2026-02-27 |
| 3 | Storefront | ✅ Done | 2026-02-27 |
| 4 | Payments | ✅ Done | 2026-02-27 |
| 5 | Customer Dashboard | ✅ Done | 2026-02-27 |
| 6 | Worker Dashboard | ✅ Done | 2026-02-27 |
| 7 | Discord Bot | ✅ Done | 2026-02-27 |
| 8 | Helpdesk + AI | ✅ Done | 2026-02-27 |
| 9 | Advanced Admin | ✅ Done | 2026-02-27 |
| 10 | Cron Jobs | ✅ Done | 2026-02-27 |
| 11 | Polish | ✅ Done | 2026-02-27 |
| 12 | Pricing Engine v2 | ✅ Done | 2026-02-28 |
| 13 | Storefront Restructure | ✅ Done | 2026-02-28 |
| 14 | Quest Pricing System | ✅ Done | 2026-02-28 |

---

## STAP 1 — Foundation

**Status:** ✅ Klaar (2026-02-27)

### Checklist

- [x] Next.js 14 + TypeScript strict geïnitialiseerd
- [x] Alle dependencies geïnstalleerd (zie package.json)
- [x] Tailwind CSS 3.4 + shadcn/ui geconfigureerd (dark theme)
- [x] Custom fonts: Cal Sans, Satoshi, JetBrains Mono
- [x] CSS variabelen voor dynamic theming (globals.css)
- [x] `.env.example` aangemaakt
- [x] Supabase migrations aangemaakt (00001–00011, 00014, 00016)
- [x] Auth setup: email + Discord OAuth (callback route)
- [x] Middleware: role-based route protection
- [x] Provider wrappers: query, auth, theme, notifications, cart
- [x] Supabase client helpers: client.ts, server.ts, admin.ts
- [ ] Base layout components: navbar, sidebar, footer (→ Stap 2+3)
- [x] Shared UI components: button, card, badge, skeleton, input, label, textarea, progress, separator
- [x] Shared utility components: status-badge, tier-badge, user-avatar, empty-state, page-header, currency-display, copy-button, logo
- [x] Lib utilities: cn, format, constants, slugify, debounce
- [ ] Lib validators: auth, order, game, service, etc. (→ Stap 2)
- [x] Zustand stores: cart, notifications, ui
- [ ] Custom hooks: use-auth, use-cart, use-realtime, etc. (→ Stap 2)
- [x] Types: database.ts (volledig schema)
- [x] next.config.ts, tailwind.config.ts, tsconfig.json
- [x] Root layout.tsx + globals.css + error.tsx + not-found.tsx + loading.tsx
- [x] Auth pagina's: login, register, forgot-password, callback

### Bestanden aangemaakt

- `boost-platform/package.json`
- `boost-platform/next.config.ts`
- `boost-platform/tailwind.config.ts`
- `boost-platform/tsconfig.json`
- `boost-platform/.eslintrc.json`
- `boost-platform/.prettierrc`
- `boost-platform/.env.example`
- `boost-platform/middleware.ts`
- `boost-platform/src/app/layout.tsx`
- `boost-platform/src/app/globals.css`
- `boost-platform/src/app/error.tsx`
- `boost-platform/src/app/not-found.tsx`
- `boost-platform/src/app/loading.tsx`
- `boost-platform/src/app/page.tsx`
- `boost-platform/src/lib/supabase/client.ts`
- `boost-platform/src/lib/supabase/server.ts`
- `boost-platform/src/lib/supabase/admin.ts`
- `boost-platform/src/lib/supabase/middleware.ts`
- `boost-platform/src/lib/utils/cn.ts`
- `boost-platform/src/lib/utils/format.ts`
- `boost-platform/src/lib/utils/constants.ts`
- `boost-platform/src/lib/utils/slugify.ts`
- `boost-platform/src/lib/utils/debounce.ts`
- `boost-platform/src/lib/config/site.ts`
- `boost-platform/src/lib/config/navigation.ts`
- `boost-platform/src/lib/config/order-statuses.ts`
- `boost-platform/src/lib/config/permissions.ts`
- `boost-platform/src/lib/validators/auth.ts`
- `boost-platform/src/lib/validators/order.ts`
- `boost-platform/src/lib/validators/game.ts`
- `boost-platform/src/lib/validators/service.ts`
- `boost-platform/src/lib/validators/worker.ts`
- `boost-platform/src/lib/validators/settings.ts`
- `boost-platform/src/stores/cart-store.ts`
- `boost-platform/src/stores/notification-store.ts`
- `boost-platform/src/stores/ui-store.ts`
- `boost-platform/src/hooks/use-auth.ts`
- `boost-platform/src/hooks/use-cart.ts`
- `boost-platform/src/hooks/use-realtime.ts`
- `boost-platform/src/hooks/use-notifications.ts`
- `boost-platform/src/types/database.ts`
- `boost-platform/src/types/order.ts`
- `boost-platform/src/types/game.ts`
- `boost-platform/src/types/worker.ts`
- `boost-platform/src/types/payment.ts`
- `boost-platform/src/components/providers/index.tsx`
- `boost-platform/src/components/providers/query-provider.tsx`
- `boost-platform/src/components/providers/auth-provider.tsx`
- `boost-platform/src/components/providers/theme-provider.tsx`
- `boost-platform/src/components/providers/cart-provider.tsx`
- `boost-platform/src/components/providers/notification-provider.tsx`
- `boost-platform/src/components/layouts/storefront-navbar.tsx`
- `boost-platform/src/components/layouts/storefront-footer.tsx`
- `boost-platform/src/components/layouts/dashboard-sidebar.tsx`
- `boost-platform/src/components/layouts/dashboard-header.tsx`
- `boost-platform/src/components/shared/logo.tsx`
- `boost-platform/src/components/shared/status-badge.tsx`
- `boost-platform/src/components/shared/tier-badge.tsx`
- `boost-platform/src/components/shared/user-avatar.tsx`
- `boost-platform/src/components/shared/empty-state.tsx`
- `boost-platform/src/components/shared/loading-spinner.tsx`
- `boost-platform/src/components/shared/confirm-dialog.tsx`
- `boost-platform/src/components/shared/page-header.tsx`
- `boost-platform/src/components/shared/currency-display.tsx`
- `boost-platform/src/components/shared/copy-button.tsx`
- `boost-platform/src/app/(auth)/layout.tsx`
- `boost-platform/src/app/(auth)/login/page.tsx`
- `boost-platform/src/app/(auth)/register/page.tsx`
- `boost-platform/src/app/(auth)/forgot-password/page.tsx`
- `boost-platform/src/app/(auth)/reset-password/page.tsx`
- `boost-platform/src/app/(auth)/callback/route.ts`
- `boost-platform/supabase/migrations/00001_enums.sql`
- `boost-platform/supabase/migrations/00002_profiles.sql`
- `boost-platform/supabase/migrations/00003_workers.sql`
- `boost-platform/supabase/migrations/00004_games_services.sql`
- `boost-platform/supabase/migrations/00005_orders.sql`
- `boost-platform/supabase/migrations/00006_messaging.sql`
- `boost-platform/supabase/migrations/00007_payments_payouts.sql`
- `boost-platform/supabase/migrations/00008_marketing.sql`
- `boost-platform/supabase/migrations/00009_settings_apikeys.sql`
- `boost-platform/supabase/migrations/00010_activity_log.sql`
- `boost-platform/supabase/migrations/00011_helpdesk.sql`
- `boost-platform/supabase/migrations/00012_loyalty.sql`
- `boost-platform/supabase/migrations/00013_affiliates.sql`
- `boost-platform/supabase/migrations/00014_rls_policies.sql`
- `boost-platform/supabase/migrations/00015_functions_triggers.sql`
- `boost-platform/supabase/migrations/00016_indexes.sql`

---

## STAP 2 — Admin Core

**Status:** ✅ Klaar (2026-02-27)

### Checklist

- [x] Admin layout shell (sidebar, header, ⌘K search)
- [x] Admin dashboard (KPI cards, revenue chart, order chart)
- [x] Service categories CRUD
- [x] Games CRUD (list, create, edit, reorder, activate/deactivate)
- [x] Services CRUD per game (form builder, price matrix editor)
- [x] Worker tiers CRUD
- [ ] Loyalty tiers CRUD (→ Stap 9 Advanced Admin)
- [x] Worker management (list, detail, tier assignment)
- [x] Worker application review
- [x] Customer management (list, detail)
- [x] Activity log viewer

### Bestanden aangemaakt

- `boost-platform/src/app/(admin)/layout.tsx`
- `boost-platform/src/app/(admin)/loading.tsx`
- `boost-platform/src/app/(admin)/dashboard/page.tsx`
- `boost-platform/src/app/(admin)/dashboard/dashboard-client.tsx`
- `boost-platform/src/app/(admin)/games/page.tsx`
- `boost-platform/src/app/(admin)/games/games-client.tsx`
- `boost-platform/src/app/(admin)/games/categories/page.tsx`
- `boost-platform/src/app/(admin)/games/categories/categories-client.tsx`
- `boost-platform/src/app/(admin)/games/[gameId]/services/page.tsx`
- `boost-platform/src/app/(admin)/games/[gameId]/services/services-client.tsx`
- `boost-platform/src/app/(admin)/workers/page.tsx`
- `boost-platform/src/app/(admin)/workers/workers-client.tsx`
- `boost-platform/src/app/(admin)/workers/tiers/page.tsx`
- `boost-platform/src/app/(admin)/workers/tiers/worker-tiers-client.tsx`
- `boost-platform/src/app/(admin)/workers/applications/page.tsx`
- `boost-platform/src/app/(admin)/workers/applications/applications-client.tsx`
- `boost-platform/src/app/(admin)/customers/page.tsx`
- `boost-platform/src/app/(admin)/customers/customers-client.tsx`
- `boost-platform/src/app/(admin)/activity/page.tsx`
- `boost-platform/src/app/(admin)/activity/activity-client.tsx`
- `boost-platform/src/components/layouts/admin-sidebar.tsx`
- `boost-platform/src/components/layouts/admin-header.tsx`
- `boost-platform/src/components/shared/loading-spinner.tsx`
- `boost-platform/src/components/shared/confirm-dialog.tsx`
- `boost-platform/src/hooks/use-auth.ts`

---

## STAP 3 — Storefront

**Status:** ✅ Klaar (2026-02-27)

### Checklist

- [x] Homepage (hero, featured games, reviews, trust, FAQ)
- [ ] Dynamic theming van site_settings (→ Stap 9 Advanced Admin)
- [x] Game listing + detail pages
- [x] Service detail + dynamic order configurator
- [x] Cart (Zustand + drawer + full page)
- [ ] Checkout flow (→ Stap 4 Payments)
- [ ] Order confirmation + public tracking (→ Stap 4)
- [ ] Public reviews page + leaderboard (→ Stap 5/6)
- [ ] Worker application page (→ Stap 6)
- [ ] FAQ + TOS + Privacy pages (→ Stap 9)

### Bestanden aangemaakt

- `src/app/(storefront)/layout.tsx`
- `src/app/(storefront)/page.tsx` + `homepage-client.tsx`
- `src/app/(storefront)/games/page.tsx`
- `src/app/(storefront)/games/[slug]/page.tsx`
- `src/app/(storefront)/games/[slug]/[serviceSlug]/page.tsx`
- `src/app/(storefront)/games/[slug]/[serviceSlug]/service-configurator.tsx`
- `src/app/(storefront)/cart/page.tsx`
- `src/components/layouts/storefront-navbar.tsx`
- `src/components/layouts/storefront-footer.tsx`
- `src/components/storefront/cart-drawer.tsx`

### Stap 4 starten — Payments

Begin met:
1. `src/app/api/checkout/route.ts` — checkout sessie aanmaken (Stripe/PayPal/balance)
2. `src/app/api/webhooks/stripe/route.ts` — Stripe webhook handler
3. `src/app/api/webhooks/paypal/route.ts` — PayPal webhook handler
4. `src/app/(storefront)/checkout/page.tsx` — checkout flow UI
5. `src/app/(storefront)/checkout/success/page.tsx` — bevestigingspagina
6. `src/lib/payments/stripe.ts` — Stripe helpers
7. `src/lib/payments/paypal.ts` — PayPal helpers
8. `src/lib/payments/balance.ts` — interne balance betalingen

---

## STAP 4 — Payments

**Status:** ✅ Klaar (2026-02-27)

### Checklist

- [x] Stripe checkout + webhook
- [x] PayPal checkout + webhook
- [x] Balance payment
- [x] Coupon validatie (server-side in checkout route)
- [ ] Referral tracking (→ Stap 5)
- [ ] Affiliate tracking (→ Stap 5)
- [ ] Loyalty points (→ Stap 9)
- [ ] Order expiry (→ Stap 10 Cron Jobs)

### Bestanden aangemaakt

- `src/lib/payments/stripe.ts` — Stripe checkout sessie, refund, webhook verificatie
- `src/lib/payments/paypal.ts` — PayPal order aanmaken, capture, webhook verificatie
- `src/lib/payments/balance.ts` — Interne balance: ophalen, valideren, aftrekken, bijschrijven
- `src/lib/payments/index.ts` — Unified payment interface (re-exports)
- `src/app/api/checkout/route.ts` — Checkout sessie aanmaken (Stripe/PayPal/balance), coupon validatie server-side
- `src/app/api/webhooks/stripe/route.ts` — Stripe webhook: payment completed, expired, refunded
- `src/app/api/webhooks/paypal/route.ts` — PayPal webhook: order approved/captured, refunded
- `src/app/api/orders/[id]/route.ts` — Order ophalen (voor success pagina)
- `src/app/(storefront)/checkout/page.tsx` — Checkout UI: betaalmethode kiezen, overzicht, betalen
- `src/app/(storefront)/checkout/success/page.tsx` — Bevestigingspagina (server wrapper)
- `src/app/(storefront)/checkout/success/success-client.tsx` — Success UI: order status, volgende stappen

---

## STAP 5 — Customer Dashboard

**Status:** ✅ Klaar (2026-02-27)

### Checklist

- [x] Layout + sidebar shell (`(customer)/layout.tsx` + `customer-shell.tsx`)
- [x] Dashboard overzicht: actieve orders, stats, recente bestellingen
- [x] Orders lijst met zoeken + filteren
- [x] Order detail: voortgangsbalk, realtime chat, bestelinfo, review prompt
- [x] Review schrijven (na voltooide bestelling)
- [x] Wallet: saldo, transactiegeschiedenis, opwaarderen UI
- [x] Referrals: link kopiëren, uitgenodigde gebruikers, statistieken
- [x] Instellingen: profiel, wachtwoord wijzigen, 2FA status, meldingsvoorkeuren

### Bestanden aangemaakt

- `src/app/(customer)/layout.tsx` — server layout met metadata
- `src/app/(customer)/loading.tsx` — skeleton loading state
- `src/components/layouts/customer-shell.tsx` — client sidebar + header shell
- `src/app/(customer)/dashboard/page.tsx` — overzicht met stats + actieve orders
- `src/app/(customer)/orders/page.tsx` — server wrapper
- `src/app/(customer)/orders/orders-client.tsx` — orders lijst met filters + zoeken
- `src/app/(customer)/orders/[id]/page.tsx` — server wrapper met auth check
- `src/app/(customer)/orders/[id]/order-detail-client.tsx` — detail + realtime chat
- `src/app/(customer)/orders/[id]/review/page.tsx` — server wrapper
- `src/app/(customer)/orders/[id]/review/review-client.tsx` — sterrenbeoordeling + opmerking
- `src/app/(customer)/wallet/page.tsx` — server wrapper
- `src/app/(customer)/wallet/wallet-client.tsx` — saldo + transacties + opwaarder modal
- `src/app/(customer)/referrals/page.tsx` — server wrapper
- `src/app/(customer)/referrals/referrals-client.tsx` — referral link + statistieken
- `src/app/(customer)/settings/page.tsx` — server wrapper
- `src/app/(customer)/settings/settings-client.tsx` — profiel, beveiliging, meldingen tabs

---

## STAP 6 — Worker Dashboard

**Status:** ✅ Klaar (2026-02-27)

### Checklist

- [x] Layout + sidebar shell (`(worker)/booster/layout.tsx` + `worker-shell.tsx`)
- [x] Dashboard overzicht: stats, tier voortgang, actieve orders, quick links
- [x] Beschikbare orders: gefilterd, claimen via API
- [x] Actieve orders lijst
- [x] Ordergeschiedenis
- [x] Order uitvoeren: status bijwerken, voortgang slider, realtime chat
- [x] Verdiensten overzicht: stats, maandelijkse breakdown, recente orders
- [x] Uitbetalingen: saldo, aanvragen, geschiedenis
- [x] Games beheren: selecteer welke games je boost
- [x] Instellingen: profiel, uitbetalingsmethode, wachtwoord
- [x] API routes: `/api/worker/orders/[id]/claim`, `/progress`, `/status`, `/payouts/request`

### Bestanden aangemaakt

- `src/app/(worker)/booster/layout.tsx` — server layout
- `src/app/(worker)/booster/loading.tsx` — skeleton
- `src/components/layouts/worker-shell.tsx` — client sidebar + header
- `src/app/(worker)/booster/dashboard/page.tsx` — stats + tier progress
- `src/app/(worker)/booster/orders/page.tsx` + `available-orders-client.tsx`
- `src/app/(worker)/booster/orders/active/page.tsx`
- `src/app/(worker)/booster/orders/history/page.tsx`
- `src/app/(worker)/booster/orders/[id]/page.tsx` + `worker-order-client.tsx`
- `src/app/(worker)/booster/earnings/page.tsx`
- `src/app/(worker)/booster/earnings/payouts/page.tsx` + `payouts-client.tsx`
- `src/app/(worker)/booster/games/page.tsx` + `worker-games-client.tsx`
- `src/app/(worker)/booster/settings/page.tsx` + `worker-settings-client.tsx`
- `src/app/api/worker/orders/[id]/claim/route.ts`
- `src/app/api/worker/orders/[id]/progress/route.ts`
- `src/app/api/worker/orders/[id]/status/route.ts`
- `src/app/api/worker/payouts/request/route.ts`

---

## STAP 7 — Discord Bot

**Status:** ✅ Klaar (2026-02-27)

### Checklist

- [x] `discord-bot/` aparte service map aangemaakt
- [x] `package.json` + `tsconfig.json` + `Dockerfile` + `.env.example`
- [x] `src/index.ts` — bot entry point, Discord client setup, event registratie
- [x] `src/deploy-commands.ts` — slash commands registreren (guild of global)
- [x] `src/lib/logger.ts` — gestructureerde logging
- [x] `src/lib/constants.ts` — status labels, kleuren
- [x] `src/lib/embeds.ts` — rich embed builders (order, stats, success, error)
- [x] `src/lib/buttons.ts` — button row builders (claim, progress)
- [x] `src/lib/permissions.ts` — `requireWorker()` + `requireAdmin()` helpers
- [x] `src/services/supabase.ts` — Supabase service role client
- [x] `src/services/notifications.ts` — stuur embeds naar Discord channels + DMs
- [x] `src/services/order-sync.ts` — Supabase realtime → Discord notificaties
- [x] `src/services/role-sync.ts` — worker tiers → Discord roles sync
- [x] `src/events/ready.ts` — bot ready: start order sync + role sync
- [x] `src/events/interaction-create.ts` — slash command + button dispatcher
- [x] `src/events/member-join.ts` — auto-assign customer role
- [x] `src/events/button-handler.ts` — claim/status/progress buttons
- [x] `src/commands/claim.ts` — `/claim <ordernummer>`
- [x] `src/commands/unclaim.ts` — `/unclaim <ordernummer>`
- [x] `src/commands/progress.ts` — `/progress <ordernummer> <percentage> [notitie]`
- [x] `src/commands/complete.ts` — `/complete <ordernummer>`
- [x] `src/commands/status.ts` — `/status <ordernummer>`
- [x] `src/commands/stats.ts` — `/stats`
- [x] `src/commands/leaderboard.ts` — `/leaderboard`
- [x] `src/commands/lookup.ts` — `/lookup <ordernummer>` (admin)
- [x] `src/commands/assign.ts` — `/assign <ordernummer> <booster>` (admin)
- [x] `src/commands/payout.ts` — `/payout`
- [x] Admin Discord settings pagina (`/admin/discord`) in de webapp
- [x] `discord-bot/README.md` met setup instructies
- [x] `tsconfig.json` webapp bijgewerkt: `discord-bot/` uitgesloten
- [x] Lokale build geslaagd ✅

### Bestanden aangemaakt

- `discord-bot/package.json`
- `discord-bot/tsconfig.json`
- `discord-bot/Dockerfile`
- `discord-bot/.env.example`
- `discord-bot/README.md`
- `discord-bot/src/index.ts`
- `discord-bot/src/deploy-commands.ts`
- `discord-bot/src/lib/logger.ts`
- `discord-bot/src/lib/constants.ts`
- `discord-bot/src/lib/embeds.ts`
- `discord-bot/src/lib/buttons.ts`
- `discord-bot/src/lib/permissions.ts`
- `discord-bot/src/services/supabase.ts`
- `discord-bot/src/services/notifications.ts`
- `discord-bot/src/services/order-sync.ts`
- `discord-bot/src/services/role-sync.ts`
- `discord-bot/src/events/ready.ts`
- `discord-bot/src/events/interaction-create.ts`
- `discord-bot/src/events/member-join.ts`
- `discord-bot/src/events/button-handler.ts`
- `discord-bot/src/commands/index.ts`
- `discord-bot/src/commands/claim.ts`
- `discord-bot/src/commands/unclaim.ts`
- `discord-bot/src/commands/progress.ts`
- `discord-bot/src/commands/complete.ts`
- `discord-bot/src/commands/status.ts`
- `discord-bot/src/commands/stats.ts`
- `discord-bot/src/commands/leaderboard.ts`
- `discord-bot/src/commands/lookup.ts`
- `discord-bot/src/commands/assign.ts`
- `discord-bot/src/commands/payout.ts`
- `src/app/(admin)/admin/discord/page.tsx`
- `src/app/(admin)/admin/discord/discord-settings-client.tsx`

---

## STAP 8 — Helpdesk + AI

**Status:** ✅ Klaar (2026-02-27)

### Checklist

- [x] `src/lib/ai/providers/types.ts` — gedeelde AI provider interface
- [x] `src/lib/ai/providers/openai.ts` — OpenAI adapter (fetch-based, geen SDK)
- [x] `src/lib/ai/providers/anthropic.ts` — Anthropic adapter (fetch-based)
- [x] `src/lib/ai/index.ts` — AI provider factory (leest uit `site_settings`)
- [x] `src/lib/ai/helpdesk-agent.ts` — helpdesk AI agent + system prompt + escalatie detectie
- [x] `src/lib/email/client.ts` — Resend API client (fetch-based)
- [x] `src/lib/email/templates/base-layout.ts` — gedeelde email layout + helpers
- [x] `src/lib/email/templates/order-confirmed.ts` — bevestigingsemail
- [x] `src/lib/email/templates/order-completed.ts` — voltooiingsemail
- [x] `src/lib/email/templates/ticket-response.ts` — ticket reactie + aanmaak email
- [x] `src/lib/email/templates/worker-approved.ts` — booster goedkeuring email
- [x] `src/lib/email/send.ts` — unified send functies per type
- [x] `src/app/api/helpdesk/route.ts` — POST (ticket aanmaken) + GET (lijst)
- [x] `src/app/api/helpdesk/[id]/route.ts` — GET (detail + berichten) + POST (reply) + PATCH (status/prioriteit)
- [x] `src/app/api/helpdesk/ai/route.ts` — AI auto-antwoord genereren + opslaan + email sturen
- [x] `src/app/(customer)/support/page.tsx` — ticket lijst + aanmaken formulier
- [x] `src/app/(customer)/support/support-client.tsx` — client UI met filter + nieuw ticket modal
- [x] `src/app/(customer)/support/[id]/page.tsx` — ticket detail server wrapper
- [x] `src/app/(customer)/support/[id]/ticket-detail-client.tsx` — chat UI + reply
- [x] `src/app/(admin)/admin/helpdesk/page.tsx` — alle tickets + stats
- [x] `src/app/(admin)/admin/helpdesk/admin-helpdesk-client.tsx` — tabel met zoeken + filteren
- [x] `src/app/(admin)/admin/helpdesk/[id]/page.tsx` — admin ticket detail
- [x] `src/app/(admin)/admin/helpdesk/[id]/admin-ticket-detail-client.tsx` — reply + interne notities + AI knop + metadata
- [x] `src/app/(admin)/admin/helpdesk/settings/page.tsx` — AI instellingen
- [x] `src/app/(admin)/admin/helpdesk/settings/helpdesk-settings-client.tsx` — provider, API key, auto-reply, SLA
- [x] Customer sidebar bijgewerkt met Support link
- [x] Lokale build geslaagd ✅

### Bestanden aangemaakt

- `src/lib/ai/providers/types.ts`
- `src/lib/ai/providers/openai.ts`
- `src/lib/ai/providers/anthropic.ts`
- `src/lib/ai/index.ts`
- `src/lib/ai/helpdesk-agent.ts`
- `src/lib/email/client.ts`
- `src/lib/email/templates/base-layout.ts`
- `src/lib/email/templates/order-confirmed.ts`
- `src/lib/email/templates/order-completed.ts`
- `src/lib/email/templates/ticket-response.ts`
- `src/lib/email/templates/worker-approved.ts`
- `src/lib/email/send.ts`
- `src/app/api/helpdesk/route.ts`
- `src/app/api/helpdesk/[id]/route.ts`
- `src/app/api/helpdesk/ai/route.ts`
- `src/app/(customer)/support/page.tsx`
- `src/app/(customer)/support/support-client.tsx`
- `src/app/(customer)/support/[id]/page.tsx`
- `src/app/(customer)/support/[id]/ticket-detail-client.tsx`
- `src/app/(admin)/admin/helpdesk/page.tsx`
- `src/app/(admin)/admin/helpdesk/admin-helpdesk-client.tsx`
- `src/app/(admin)/admin/helpdesk/[id]/page.tsx`
- `src/app/(admin)/admin/helpdesk/[id]/admin-ticket-detail-client.tsx`
- `src/app/(admin)/admin/helpdesk/settings/page.tsx`
- `src/app/(admin)/admin/helpdesk/settings/helpdesk-settings-client.tsx`

---

## STAP 9 — Advanced Admin

**Status:** ✅ Klaar (2026-02-27)

### Checklist

- [x] Finance dashboard: omzet, marge, maandgrafiek
- [x] Transacties overzicht: alle betalingen met zoeken
- [x] Uitbetalingen beheer: openstaand saldo, verwerken
- [x] Coupons CRUD: aanmaken, activeren/deactiveren
- [x] Loyaliteitsprogramma: tiers CRUD + punten-per-euro instelling
- [x] Referral programma: beloning instellen, statistieken
- [x] Promo banners: aanmaken, kleur, CTA, planning, toggle
- [x] Aankondigingen: aanmaken, type (info/warning/success/maintenance), toggle
- [x] Statische pagina's editor: FAQ, TOS, Privacy (markdown)
- [x] Storefront thema: kleuren, presets, lettertypen, sitenaam
- [x] Algemene instellingen: site info, onderhoudsmodus, registratie toggle
- [x] Betaalinstellingen: Stripe/PayPal/saldo toggles, test/live modus, limieten
- [x] Notificatie-instellingen: email + Discord toggles per event
- [x] Bulk import: CSV upload, preview, validatie, API route
- [x] API routes: `/api/admin/payouts/[id]`, `/api/admin/coupons`, `/api/admin/import`
- [x] Lokale build geslaagd ✅

### Bestanden aangemaakt

- `src/app/(admin)/admin/finance/page.tsx` + `finance-client.tsx`
- `src/app/(admin)/admin/finance/transactions/page.tsx` + `transactions-client.tsx`
- `src/app/(admin)/admin/finance/payouts/page.tsx` + `payouts-admin-client.tsx`
- `src/app/(admin)/admin/marketing/coupons/page.tsx` + `coupons-client.tsx`
- `src/app/(admin)/admin/marketing/loyalty/page.tsx` + `loyalty-client.tsx`
- `src/app/(admin)/admin/marketing/referrals/page.tsx` + `referrals-admin-client.tsx`
- `src/app/(admin)/admin/content/banners/page.tsx` + `banners-client.tsx`
- `src/app/(admin)/admin/content/announcements/page.tsx` + `announcements-client.tsx`
- `src/app/(admin)/admin/content/pages/page.tsx` + `static-pages-client.tsx`
- `src/app/(admin)/admin/storefront/theme/page.tsx` + `theme-client.tsx`
- `src/app/(admin)/admin/settings/page.tsx` + `general-settings-client.tsx`
- `src/app/(admin)/admin/settings/payments/page.tsx` + `payment-settings-client.tsx`
- `src/app/(admin)/admin/settings/notifications/page.tsx` + `notification-settings-client.tsx`
- `src/app/(admin)/admin/import/page.tsx` + `import-client.tsx`
- `src/app/api/admin/payouts/[id]/route.ts`
- `src/app/api/admin/coupons/route.ts`
- `src/app/api/admin/coupons/[id]/route.ts`
- `src/app/api/admin/import/route.ts`

---

## STAP 10 — Cron Jobs

**Status:** ✅ Klaar (2026-02-27)

### Checklist

- [x] `src/lib/cron/auth.ts` — CRON_SECRET validatie helper
- [x] `src/lib/cron/logger.ts` — cron run logger (schrijft naar `cron_logs` tabel)
- [x] `src/app/api/cron/payouts/route.ts` — wekelijkse auto-uitbetalingen (idempotent)
- [x] `src/app/api/cron/cleanup/route.ts` — dagelijkse opruiming (stale orders, verlopen coupons, credentials TTL, log pruning)
- [x] `src/app/api/cron/loyalty/route.ts` — maandelijkse punten expiratie + tier herberekening
- [x] `src/app/api/cron/worker-tiers/route.ts` — wekelijkse worker tier auto-promotie/demotie
- [x] `vercel.json` cron schedules bijgewerkt (maandag 08:00, dagelijks 03:00, 1e maand 04:00, zondag 06:00)
- [x] `src/app/(admin)/admin/activity/page.tsx` + `activity-client.tsx` — cron log viewer met handmatig starten
- [x] `supabase/migrations/00017_cron_logs.sql` — cron_logs, loyalty_transactions, loyalty_tiers, promo_banners, announcements, static_pages, coupons tabellen
- [x] Lokale build geslaagd ✅

### Bestanden aangemaakt

- `src/lib/cron/auth.ts`
- `src/lib/cron/logger.ts`
- `src/app/api/cron/payouts/route.ts`
- `src/app/api/cron/cleanup/route.ts`
- `src/app/api/cron/loyalty/route.ts`
- `src/app/api/cron/worker-tiers/route.ts`
- `src/app/(admin)/admin/activity/page.tsx`
- `src/app/(admin)/admin/activity/activity-client.tsx`
- `supabase/migrations/00017_cron_logs.sql`

---

## STAP 11 — Polish

**Status:** ✅ Klaar (2026-02-27)

### Checklist

- [x] `src/app/sitemap.ts` — dynamische sitemap met alle games
- [x] `src/app/robots.ts` — robots.txt met correcte allow/disallow regels
- [x] `src/app/opengraph-image.tsx` — dynamische OG image (1200×630, edge runtime)
- [x] `src/app/layout.tsx` — verbeterde metadata: metadataBase, keywords, authors, OG images, Twitter card
- [x] `src/app/(storefront)/layout.tsx` — PageTransition wrapper + correcte Engelse metadata
- [x] `src/app/(storefront)/loading.tsx` — skeleton loader voor storefront
- [x] `src/app/(storefront)/error.tsx` — error boundary met Try again + Go home
- [x] `src/app/(customer)/loading.tsx` — skeleton loader voor customer dashboard
- [x] `src/app/(customer)/error.tsx` — error boundary voor customer routes
- [x] `src/app/(worker)/error.tsx` — error boundary voor worker routes
- [x] `src/app/(admin)/error.tsx` — error boundary voor admin routes (met dev error details)
- [x] `src/components/layouts/page-transition.tsx` — Framer Motion fade+slide transitions
- [x] `src/app/not-found.tsx` — verbeterde 404 pagina met glow + Go home + Browse games
- [x] Homepage stats cards: glassmorphism border + achtergrond voor betere mobile leesbaarheid
- [x] Lokale build geslaagd ✅

### Bestanden aangemaakt

- `src/app/sitemap.ts`
- `src/app/robots.ts`
- `src/app/opengraph-image.tsx`
- `src/app/(storefront)/loading.tsx`
- `src/app/(storefront)/error.tsx`
- `src/app/(customer)/loading.tsx`
- `src/app/(customer)/error.tsx`
- `src/app/(worker)/error.tsx`
- `src/app/(admin)/error.tsx`
- `src/components/layouts/page-transition.tsx`
- `postcss.config.js` (kritieke fix: Tailwind CSS generatie)

---

---

## STEP 12 — Pricing Engine v2 (XP-based + Stat-based)

**Status:** ✅ Done (2026-02-28)

### What was built

A complete overhaul of the service pricing system to support complex OSRS-style pricing models.

#### New pricing types in `src/types/service-config.ts`
- `xp_based` — customer picks skill + start/end level, price calculated from XP tables with method multipliers, route planner, and tier modifier fields
- `per_item` — fixed price per item selected from a list
- `per_unit` — price × quantity
- `stat_based` — base price multiplied by account stat thresholds (e.g. Prayer level)
- `per_item_stat_based` — quest selected → base price modified by account stats (see Step 14)

#### New form field types
- `multi_select` — customer can select multiple options simultaneously; all multipliers stack

#### Key files
- `src/types/service-config.ts` — all pricing types, `FormField`, `PriceMatrix`, `StatConfig`, `StatThreshold`, `PriceItem`, `QuestModifierField`, `QuestModifierOption`, `PerItemStatBasedPriceMatrix`
- `src/lib/pricing-engine.ts` — `calculatePrice()`, `calcXpBased()`, `calcStatBased()`, `calcPerItemStatBased()`, `applyModifiers()`, `resolveStatMultiplier()`
- `src/components/admin/service-form-builder/index.tsx` — main form builder, pricing type selector
- `src/components/admin/service-form-builder/PricingTypeSelector.tsx` — 5 pricing type cards
- `src/components/admin/service-form-builder/XpBasedConfig.tsx` — XP pricing admin UI (skills, methods, route planner, tier modifiers)
- `src/components/admin/service-form-builder/StatBasedConfig.tsx` — stat-based pricing admin UI (stats, thresholds, price bands)
- `src/components/admin/service-form-builder/PerItemConfig.tsx` — per-item pricing admin UI
- `src/components/admin/service-form-builder/PerUnitConfig.tsx` — per-unit pricing admin UI
- `src/components/admin/service-form-builder/ModifiersConfig.tsx` — global form fields (radio, select, checkbox, multi_select)
- `src/components/storefront/StatCalculator.tsx` — customer-facing stat input with OSRS username lookup (fetches live stats from Hiscores API)
- `src/app/api/osrs-stats/route.ts` — OSRS Hiscores proxy API

---

## STEP 13 — Storefront Route Restructure

**Status:** ✅ Done (2026-02-28)

### What changed

The storefront URL structure was changed from flat to hierarchical to support categories:

| Before | After |
|--------|-------|
| `/games/[slug]` | `/games/[slug]` — now shows category grid |
| `/games/[slug]/[serviceSlug]` | `/games/[slug]/[categorySlug]` — services list |
| — | `/games/[slug]/[categorySlug]/[serviceSlug]` — service detail |

#### Key files
- `src/app/(storefront)/games/[slug]/page.tsx` — category grid page (fetches categories filtered by game_id)
- `src/app/(storefront)/games/[slug]/[categorySlug]/page.tsx` — NEW: services list within a category
- `src/app/(storefront)/games/[slug]/[categorySlug]/[serviceSlug]/page.tsx` — NEW: service detail page
- `src/app/(storefront)/games/[slug]/[categorySlug]/[serviceSlug]/service-configurator.tsx` — full service configurator (moved here)

#### Image support
- Categories and services can have images uploaded via `ImageUpload` component
- `supabase/migrations/add_image_url_to_service_categories.sql` — adds `image_url` column
- `src/types/database.ts` — updated with `image_url` on `service_categories`
- Admin UI: `categories-client.tsx` and `services-client.tsx` both support image upload

#### Hydration fixes
- `src/components/layouts/page-transition.tsx` — defers framer-motion until client mount
- `src/components/layouts/storefront-navbar.tsx` — `mounted` state for cart badge + auth menu
- `src/components/layouts/storefront-footer.tsx` — hardcoded year to avoid SSR mismatch

#### All pages use `export const dynamic = "force-dynamic"` to prevent stale Vercel cache

---

## STEP 14 — Quest Pricing System (per_item_stat_based)

**Status:** ✅ Done (2026-02-28)

### What was built

A complete quest pricing system for OSRS questing services where:
1. Customer selects a quest from a dropdown
2. Account stats (Prayer, Ranged, etc.) modify the base price via threshold bands
3. Per-quest modifier fields (e.g. "No Stamina", "No Tbow") further adjust the price
4. Each quest can have its own stats and modifiers, overriding global defaults

### Database
- `game_quests` table — stores all OSRS quests with: `id`, `game_id`, `name`, `slug`, `difficulty`, `length`, `quest_points`, `series`, `is_members`, `sort_order`
- RLS policies: public read, admin write
- All OSRS quests pre-populated (F2P + Members)
- SQL: run `CREATE TABLE` first, then `INSERT` statements (see Supabase SQL editor)

```sql
-- Permissions needed:
GRANT ALL ON public.game_quests TO service_role;
GRANT ALL ON public.game_quests TO authenticated;
GRANT SELECT ON public.game_quests TO anon;
```

### Admin UI
- `src/components/admin/service-form-builder/PerItemStatBasedConfig.tsx` — main config component
  - Quest list with base price per quest
  - "Import from database" button (filters: All / Members / F2P)
  - Each quest row has a **"config"** button that expands to show:
    - **Per-quest account stats** — overrides global stats for this quest
    - **Per-quest price modifiers** — overrides global modifiers for this quest
    - "Copy global" button to start from the global stats
  - Global stats section (fallback for quests without custom stats)
  - Modifier field types: `radio` (single choice), `multi_select` (multiple, stacking), `select` (dropdown), `checkbox`

### Storefront
- `src/app/(storefront)/games/[slug]/[categorySlug]/[serviceSlug]/service-configurator.tsx`
  - Quest dropdown (shows description + base price)
  - After quest selected: shows per-quest stats (or global fallback)
  - Shows per-quest modifiers (or global fallback)
  - Multi-select modifiers shown as toggle buttons with checkmarks
  - Select modifiers shown as native `<select>` dropdown
  - Radio modifiers shown as button grid
  - Stat values reset when switching quests

### API
- `src/app/api/admin/game-quests/route.ts` — fetches quests from `game_quests` table
  - Uses `SUPABASE_SERVICE_ROLE_KEY` directly to bypass TypeScript type restrictions
  - Query params: `game_id` (required), `members` (`true` / `false` / `all`)

### Pricing engine
- `calcPerItemStatBased()` in `src/lib/pricing-engine.ts`:
  1. Find selected quest → get base price
  2. Apply per-quest stats (or global stats) via threshold multipliers
  3. Apply per-quest modifiers (or global modifiers): `select`/`radio` → single option, `multi_select` → all selected options stack, `checkbox` → on/off
  4. Apply global form modifiers on top
  5. Apply minimum price

### Key types in `src/types/service-config.ts`
```typescript
interface QuestModifierOption { value: string; label: string; multiplier?: number; price_add?: number; }
interface QuestModifierField { id: string; label: string; type: "select" | "radio" | "multi_select" | "checkbox"; required?: boolean; options?: QuestModifierOption[]; multiplier?: number; price_add?: number; }
interface PriceItem { id: string; label: string; price: number; description?: string; stats?: StatConfig[]; modifiers?: QuestModifierField[]; }
interface PerItemStatBasedPriceMatrix { type: "per_item_stat_based"; items: PriceItem[]; stats: StatConfig[]; modifiers?: QuestModifierField[]; minimum_price?: number; }
```

---

## Notes for next chat

- **ALWAYS read this file first before making changes**
- Project path: `c:\Users\RTX40\Desktop\Jason\coding stuff\boosting\`
- Live site: https://boosting-self.vercel.app
- GitHub: configure the white-label template repository in CodeCraft/Vercel before customer deployments.
- OSRS game ID in Supabase: `a8c56ade-08b9-4765-a596-9d9a3d5b1ab7`
- All UI text must be in **English** (no Dutch)
- PowerShell: use `;` NOT `&&`, no HEREDOC syntax
  ```
  git add -A; git commit -m "message"; git push
  ```

### ⚠️ Known conventions & gotchas

- `setAll` callbacks in Supabase helpers require explicit `CookieOptions` type annotation
- Never create `createClient()` at module level in providers — use `useMemo()` or `useEffect`
- Server-side Supabase helper: `createClient` from `@/lib/supabase/server`
- Admin Supabase helper: `createAdminClient` from `@/lib/supabase/admin`
- For tables not yet in `database.ts` types: use `createSupabaseClient` directly with `SUPABASE_SERVICE_ROLE_KEY`
- All storefront pages use `export const dynamic = "force-dynamic"` to avoid stale Vercel cache
- Route structure: `/games/[slug]/[categorySlug]/[serviceSlug]` — three levels deep
- `PageHeader` component accepts `action` prop for right-aligned buttons
- Stat labels auto-fill from ID on blur if left empty (admin UI)
- `confirm-dialog.tsx` default labels: "Confirm" / "Cancel"

### Supabase migrations applied (in order)
1. `00001_enums.sql` through `00017_cron_logs.sql` — base schema
2. `add_game_id_to_service_categories.sql`
3. `fix_services_slug_unique_constraint.sql`
4. `add_image_url_to_service_categories.sql`
5. `game_quests` table created manually via SQL editor (see Step 14 above)

### Environment variables needed (`.env.local`)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`
- `RESEND_API_KEY`
- `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`
- `CRON_SECRET`
