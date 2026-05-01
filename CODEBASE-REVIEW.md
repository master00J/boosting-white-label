# BoostPlatform — Codebase Architecture Review

> **Datum:** 7 maart 2026  
> **Doel:** Technisch overzicht voor senior developer onboarding & security audit

---

## 1. High-Level Overzicht

BoostPlatform is een **game boosting marktplaats** gebouwd als een Next.js 15 fullstack applicatie met een losstaande Discord-bot. Klanten bestellen boosting-diensten, workers (boosters) voeren ze uit, en admins beheren het geheel.

### Tech Stack

| Laag | Technologie |
|------|-------------|
| Frontend | Next.js 15 App Router, React 19, TypeScript |
| Styling | Tailwind CSS 3.4, Radix UI, shadcn/ui, Framer Motion |
| Database | Supabase (PostgreSQL + Auth + RLS + Realtime + Storage) |
| Betalingen | Stripe, PayPal, Whop SDK, in-app balance, OSRS gold |
| State | Zustand (client), TanStack Query v5 (server state) |
| Forms | React Hook Form + Zod validatie |
| E-mail | Resend API |
| Rate Limiting | Upstash Redis (met in-memory fallback) |
| Discord | discord.js v14 (aparte Node.js service) |
| Hosting | Vercel (webapp), Docker (Discord bot) |
| CI/Cron | Vercel Cron Jobs |

---

## 2. Directorystructuur

```
boosting/
│
├── src/                          # Next.js applicatie
│   ├── app/                      # App Router pages + API routes
│   │   ├── (admin)/              # Admin panel (dashboard, orders, games, workers, finance)
│   │   ├── (auth)/               # Login, register, forgot-password, OAuth callback
│   │   ├── (customer)/           # Klant dashboard (orders, wallet, support, loadouts)
│   │   ├── (storefront)/         # Publieke webshop (home, games, lootboxes, cart, checkout)
│   │   ├── (worker)/             # Booster dashboard
│   │   └── api/                  # ~69 API routes
│   │       ├── admin/            # Admin CRUD (games, coupons, workers, settings, payouts)
│   │       ├── auth/             # ensure-profile
│   │       ├── checkout/         # Checkout flow
│   │       ├── cron/             # Scheduled jobs (payouts, cleanup, loyalty, worker-tiers)
│   │       ├── webhooks/         # Stripe, PayPal, Whop, RuneLite
│   │       ├── worker/           # Worker order management, payouts
│   │       ├── orders/           # Order details, messages
│   │       ├── helpdesk/         # Support tickets, AI agent
│   │       └── ...               # affiliate, lootbox, gear-optimize, etc.
│   │
│   ├── components/
│   │   ├── ui/                   # shadcn/ui primitives (button, card, dialog, etc.)
│   │   ├── layouts/              # Admin sidebar, storefront navbar, customer shell
│   │   ├── providers/            # Auth, Cart, Query, Theme, Notification providers
│   │   ├── storefront/           # Cart drawer, promo banners, GearOptimizer
│   │   └── seo/                  # JSON-LD structured data
│   │
│   ├── lib/
│   │   ├── ai/                   # Helpdesk AI agent (OpenAI/Anthropic)
│   │   ├── config/               # Site config, permissions, order statuses
│   │   ├── cron/                 # Cron auth (CRON_SECRET)
│   │   ├── email/                # Resend client + templates
│   │   ├── payments/             # Stripe, PayPal, Whop, balance handlers
│   │   ├── supabase/             # Client (browser), server (SSR), admin (service role), middleware
│   │   ├── utils/                # Formatters, slugify, constants
│   │   ├── rate-limit.ts         # Upstash Redis rate limiter
│   │   └── pricing-engine.ts     # Dynamische prijsberekening
│   │
│   ├── hooks/                    # use-auth
│   ├── stores/                   # Zustand stores (cart, ui, notifications)
│   └── types/                    # Database types (Supabase generated), service config
│
├── discord-bot/                  # Standalone Discord bot service
│   ├── src/
│   │   ├── index.ts              # Entry point
│   │   ├── deploy-commands.ts    # Slash command registratie
│   │   ├── commands/             # assign, claim, complete, leaderboard, lookup, payout, etc.
│   │   ├── events/               # ready, interaction-create, member-join, button-handler
│   │   └── services/             # supabase, order-sync, role-sync, review-sync, ticket-service
│   └── Dockerfile                # Node 20 Alpine productie-image
│
├── supabase/
│   └── migrations/               # 58+ SQL migraties (schema, RLS, triggers, RPCs)
│
├── scripts/
│   └── import-osrs-items.ts      # Eenmalige OSRS Wiki import
│
├── public/                       # Static assets (fonts, images, lootbox sprites)
├── next.config.ts                # CSP headers, image domains, security headers
├── vercel.json                   # Deploy config + cron schedules
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 3. Authenticatie & Autorisatie

### Auth Flow

```
Browser → Supabase Auth (email/password of Discord OAuth)
       → /auth/callback (code exchange)
       → /api/auth/ensure-profile (profiel aanmaken als trigger faalt)
       → Middleware (sessie refresh, role-check, route bescherming)
```

### Middleware (`src/middleware.ts`)

De middleware is het **centraal toegangscontrolepunt** en handelt elke request af:

1. **Sessie vernieuwing** via `@supabase/ssr` cookie handling
2. **API routes** worden doorgelaten (doen zelf auth)
3. **Publieke routes** zonder auth: `/`, `/games`, `/faq`, `/tos`, `/privacy`, etc.
4. **Auth routes** (`/login`, `/register`): ingelogde users → redirect naar `/dashboard`
5. **Beschermde routes**: geen user → redirect naar `/login?redirectTo=<path>`
6. **Role-based routing**:
   - Profiel ophalen uit `profiles` tabel
   - Geen profiel → redirect naar `/api/auth/ensure-profile`
   - `is_banned` → redirect naar `/login?error=banned`
   - `/admin/*` → alleen `admin` en `super_admin`
   - `/worker/*` → alleen `worker`, `admin`, `super_admin`

### Permissions (`src/lib/config/permissions.ts`)

Fijn-granulaire permissies per rol:

```
customer  → orders:create, orders:read_own, tickets:create
worker    → orders:claim, orders:update_progress, payouts:request
admin     → admin:access, orders:manage, users:manage, settings:manage
super_admin → alles + users:ban, settings:danger
```

### API Route Authenticatie

Alle API routes volgen hetzelfde patroon:
1. `createClient()` → `supabase.auth.getUser()` voor sessie-validatie
2. Admin routes: extra role-check via `profiles.role`
3. Mutaties met verhoogde rechten: `createAdminClient()` (service role, bypasses RLS)

---

## 4. Database Architectuur

### Supabase (PostgreSQL)

**58+ migraties** in `supabase/migrations/`, geordend op nummer.

### Kern-tabellen

| Tabel | Doel | Relaties |
|-------|------|----------|
| `profiles` | User profielen (extensie van `auth.users`) | FK → `auth.users` |
| `workers` | Booster gegevens, tier, commissie | FK → `profiles`, `worker_tiers` |
| `worker_tiers` | Tier systeem (bronze, silver, gold, etc.) | — |
| `games` | Beschikbare games | — |
| `services` | Boosting diensten per game | FK → `games` |
| `orders` | Bestellingen | FK → `profiles` (customer), `workers`, `services`, `games` |
| `order_messages` | Chat berichten per order | FK → `orders` |
| `order_reviews` | Reviews na afronding | FK → `orders` |
| `coupons` | Kortingscodes (incl. user-specifiek) | FK → `profiles` (optioneel) |
| `support_tickets` | Helpdesk tickets | FK → `profiles` |
| `lootboxes` | Lootbox definities | — |
| `lootbox_prizes` | Prijzen per lootbox tier | FK → `lootboxes` |
| `lootbox_opens` | Opens door users | FK → `profiles`, `lootboxes` |
| `affiliates` | Affiliate programma | FK → `profiles` |
| `activity_log` | Audit trail | — |
| `site_settings` | Key-value configuratie | — |
| `processed_webhooks` | Webhook idempotency | — |
| `cron_logs` | Cron job logging | — |
| `osrs_items` | OSRS gear database | — |

### Row Level Security (RLS)

Alle tabellen hebben RLS policies. Helper functies:

- `get_user_role()` — retourneert role van huidige user (SECURITY DEFINER)
- `is_admin()` — true als role = admin of super_admin
- `is_worker()` — true als user een verified worker is

**Policies per rol:**
- **Customers** → eigen orders, eigen profiel, eigen tickets
- **Workers** → eigen/claimed orders, queued orders (voor claiming)
- **Admins** → alles lezen en schrijven

### Database RPCs

- `process_payment(p_order_ids, p_payment_id, p_affiliate_id, p_commission, p_customer_id, p_total_spent)` — Atomic payment processing: orders updaten, affiliate credit, total_spent bijwerken. Alleen via service role.

---

## 5. Betalingssysteem

### Ondersteunde methoden

| Methode | Provider | Flow |
|---------|----------|------|
| Creditcard | Stripe Checkout | Redirect → webhook |
| PayPal | PayPal REST API v2 | Redirect → approval → capture → webhook |
| Whop | Whop SDK | Hidden plan → checkout → webhook |
| Balance | In-app wallet | Directe deductie |
| OSRS Gold | Handmatig | Instructies voor goud-betaling |

### Checkout Flow (`/api/checkout`)

```
Client POST /api/checkout { items, method, couponCode }
  ↓
Auth check → Rate limit → Coupon validatie → Fee berekening
  ↓
Order(s) INSERT (status: pending_payment)
  ↓
├── Stripe  → createStripeCheckoutSession() → redirect URL
├── PayPal  → createPayPalOrder() → approval URL
├── Whop    → createWhopCheckout() → checkout URL
├── Balance → validateBalancePayment() + deductBalance() → direct queued
└── Gold    → instructies + gold_amount
```

### Webhook Processing

Alle webhooks volgen hetzelfde patroon:
1. Signature/header verificatie
2. Event type routing
3. Order status update (`paid` / `completed` / `refunded`)
4. Affiliate commissie credit
5. `total_spent` update op profiel
6. Activity log entry

**Idempotency:** Whop webhooks worden geregistreerd in `processed_webhooks` om duplicaten te voorkomen.

---

## 6. Discord Bot Architectuur

### Connectie met Hoofdapp

De Discord bot is een **aparte Node.js service** die via Supabase Realtime luistert naar database-wijzigingen:

```
Supabase Realtime (orders, order_messages, order_reviews)
  ↓
Discord Bot (discord.js v14)
  ↓
├── order-sync.ts    → Nieuwe orders naar admin/worker channels, ticket aanmaken
├── role-sync.ts     → Worker tier → Discord role mapping
├── review-sync.ts   → Reviews naar reviews channel
├── ticket-service.ts → Privé ticket-kanalen per order
└── notifications.ts  → DMs en channel berichten
```

### Order Sync Flow

1. **Realtime** luistert op `orders` INSERT/UPDATE en `order_messages` INSERT
2. **Polling fallback** elke 45 seconden voor `pending_payment`, `paid`, `queued`
3. **Nieuwe order** → bericht in admin channel + workers channel (met claim-button)
4. **Status wijziging** → ticket update, admin alert, worker DM bij completion
5. **Progress update** → progress bar in ticket kanaal

### Ticket Service

- Privé kanaal per order (alleen klant + admin role)
- Automatisch sluiten bij completion (kanaal hernoemd naar `closed-*`)
- System messages uit `order_messages` worden doorgestuurd

### Slash Commands

`assign`, `claim`, `complete`, `leaderboard`, `lookup`, `payout`, `progress`, `stats`, `status`, `unclaim`

---

## 7. Cron Jobs

| Job | Schedule | Functie |
|-----|----------|---------|
| **payouts** | Maandag 08:00 UTC | Onbetaalde completed orders groeperen per worker, payout-records aanmaken |
| **cleanup** | Dagelijks 03:00 UTC | Stale orders (>24h) cancellen, verlopen coupons deactiveren, credentials >30d wissen, cron_logs >90d verwijderen |
| **loyalty** | 1e van de maand 04:00 UTC | Loyalty points >12 maanden expiren, tiers herberekenen |
| **worker-tiers** | Zondag 06:00 UTC | Promotie/demotie op basis van completed orders, rating, completion rate |

**Auth:** Alle cron endpoints vereisen `Authorization: Bearer <CRON_SECRET>`.  
**Logging:** Elke run wordt gelogd in `cron_logs` tabel.

---

## 8. E-mail Systeem

**Provider:** Resend API (`src/lib/email/client.ts`)

### Templates

| Template | Trigger |
|----------|---------|
| `order-confirmed` | Na succesvolle betaling |
| `order-completed` | Wanneer order is afgerond |
| `ticket-created` | Bij nieuw support ticket |
| `ticket-response` | Bij antwoord op ticket (incl. AI) |
| `worker-approved` | Wanneer booster wordt goedgekeurd |

Alle templates gebruiken een gedeelde `base-layout` met consistent branding.

---

## 9. State Management

### Client-side

| Store | Technologie | Persistentie | Doel |
|-------|-------------|--------------|------|
| Cart | Zustand + persist | localStorage (`boost-cart`) | Winkelwagen items, coupon |
| UI | Zustand | Geen | Sidebar state, modals |
| Notifications | Zustand | Geen | Toast notifications |
| Auth | React Context | Supabase session | User + profiel |
| Server state | TanStack Query v5 | Cache | API data fetching |

### Provider Hierarchy

```
QueryProvider → AuthProvider → ThemeProvider → CartProvider → NotificationProvider → Toaster
```

---

## 10. Security Maatregelen

### Huidige maatregelen

- **RLS** op alle Supabase tabellen
- **CSP headers** in `next.config.ts`
- **Webhook signature verificatie** (Stripe, Whop, PayPal)
- **Rate limiting** via Upstash Redis op checkout en gevoelige endpoints
- **Credential encryption** (`CREDENTIALS_ENCRYPTION_KEY`)
- **CRON_SECRET** voor scheduled jobs
- **Role-based middleware** met redirect voor ongeautoriseerde toegang
- **.env files** in `.gitignore`

### Recent gefixte security issues

| Ernst | Issue | Fix |
|-------|-------|-----|
| **Critical** | Admin domain route zonder auth | Auth check + admin role verificatie toegevoegd |
| **Critical** | Placeholder Supabase keys bij ontbrekende env vars | Strikte env validatie met foutmelding |
| **Critical** | PayPal webhook zonder echte signature verificatie | PayPal REST API signature verificatie geïmplementeerd |
| **High** | Upload-image bucket/folder uit ongevalideerde input | Whitelist + regex validatie |
| **High** | Domain input niet gevalideerd | Regex patroon validatie |
| **High** | Gevoelige data in webhook logs | Logging beperkt tot niet-gevoelige velden |
| **High** | Broken OSRS icon URLs (typo) | `runiscape` → `runescape` |
| **Medium** | JSON-LD XSS via `</script>` injection | `safeJsonLd()` helper met escape |
| **Medium** | Import secret via URL parameter | Alleen Authorization header geaccepteerd |
| **Low** | Console.log met debug data in productie | Verwijderd |

### Resterende aandachtspunten

- **CSP** bevat `unsafe-inline` en `unsafe-eval` in `script-src` — overweeg nonce-based CSP
- **In-memory rate limiting** op RuneLite webhook werkt niet over meerdere Vercel instances
- **Type safety** — veel `as any` en `as unknown as` casts door Supabase type mismatches
- **`npm audit`** — periodiek draaien voor dependency CVE's

---

## 11. Deploy & Infra

### Vercel (Webapp)

- **Framework:** Next.js 15
- **Build:** `next build`
- **Env vars:** Vercel dashboard (niet in code)
- **Cron:** Vercel Cron via `vercel.json`
- **Domains:** Custom domain management via Vercel API

### Discord Bot

- **Runtime:** Node.js 20
- **Container:** Docker (Alpine-based)
- **Deploy:** Handmatig of via CI (zie `discord-bot/DEPLOY.md`)
- **Env vars:** `.env` file in container

### Supabase

- **Migraties:** 58+ SQL bestanden, handmatig of via `supabase db push`
- **Type generation:** `npx supabase gen types typescript`

---

*Dit rapport is gegenereerd op basis van een volledige codebase scan en beveiligingsreview. Alle genoemde security fixes zijn doorgevoerd in de codebase.*
