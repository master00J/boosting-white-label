# BoostPlatform — Full Stack Game Boosting Service

## Complete Build Plan for Cursor

---

## 1. Concept & Vision

A premium game boosting/powerleveling platform where customers order services across multiple games, workers/boosters claim and fulfill orders through a tiered system, and admins manage the entire operation via a comprehensive dashboard. The entire flow is synced with Discord for real-time notifications, order management, and team communication.

**Core principles:**
- Multi-game architecture with dynamic game/service management
- Tier-based worker system with progression and access control
- Fully customizable storefront controlled from admin panel
- Discord server synchronization for notifications and worker coordination
- Plug-and-play payment processors (Stripe, PayPal, extensible)
- AI-powered helpdesk with configurable provider
- Production-grade security, encryption, and audit trails

---

## 2. Tech Stack

```
Framework:       Next.js 14 (App Router) + React 18 + TypeScript (strict)
Styling:         Tailwind CSS 3.4 + shadcn/ui (customized dark theme)
Database:        Supabase (PostgreSQL + Auth + Realtime + Storage + Edge Functions)
Payments:        Stripe + PayPal (unified interface, extensible)
Discord:         discord.js v14 (separate Node.js service on VPS)
Hosting:         Vercel (webapp) + VPS (Discord bot + cron workers)
Email:           Resend (transactional emails with React Email templates)
AI Helpdesk:     Configurable — OpenAI / Anthropic / custom (via admin settings)
State:           Zustand (client state) + TanStack Query v5 (server state)
Forms:           React Hook Form + Zod validation
Animations:      Framer Motion
Rich Text:       Tiptap (for admin content editing)
File Upload:     Supabase Storage + presigned URLs
Search:          cmdk (⌘K command palette)
Charts:          Recharts
Tables:          TanStack Table v8
```

---

## 3. Folder Structure

```
boost-platform/
│
├── .cursor/
│   └── rules                              # Cursor AI instructions
│
├── .env.local                             # Local environment variables
├── .env.example                           # Template with all required vars
├── .eslintrc.json                         # ESLint config (strict)
├── .prettierrc                            # Prettier config
├── next.config.ts                         # Next.js configuration
├── tailwind.config.ts                     # Tailwind + custom theme tokens
├── tsconfig.json                          # TypeScript strict mode
├── package.json
├── middleware.ts                           # Auth + role-based route protection
│
├── public/
│   ├── fonts/
│   │   ├── CalSans-SemiBold.woff2
│   │   └── Satoshi-Variable.woff2
│   ├── images/
│   │   ├── branding/                      # Logo, favicon, OG images
│   │   ├── games/                         # Game logos/banners (fallback)
│   │   └── empty-states/                  # Illustration SVGs
│   └── robots.txt
│
├── supabase/
│   ├── config.toml
│   ├── seed.sql                           # Demo data for development
│   └── migrations/
│       ├── 00001_enums.sql
│       ├── 00002_profiles.sql
│       ├── 00003_workers.sql
│       ├── 00004_games_services.sql
│       ├── 00005_orders.sql
│       ├── 00006_messaging.sql
│       ├── 00007_payments_payouts.sql
│       ├── 00008_marketing.sql
│       ├── 00009_settings_apikeys.sql
│       ├── 00010_activity_log.sql
│       ├── 00011_helpdesk.sql
│       ├── 00012_loyalty.sql
│       ├── 00013_affiliates.sql
│       ├── 00014_rls_policies.sql
│       ├── 00015_functions_triggers.sql
│       └── 00016_indexes.sql
│
└── src/
    │
    ├── app/
    │   ├── layout.tsx                     # Root layout: fonts, metadata, providers
    │   ├── page.tsx                       # Redirect to storefront
    │   ├── globals.css                    # Tailwind base + CSS variables + custom
    │   ├── loading.tsx                    # Global loading fallback
    │   ├── error.tsx                      # Global error boundary
    │   ├── not-found.tsx                  # Custom 404
    │   ├── sitemap.ts                     # Dynamic sitemap generation
    │   ├── robots.ts                      # Robots.txt generation
    │   │
    │   ├── (storefront)/                  # PUBLIC WEBSHOP
    │   │   ├── layout.tsx                 # Storefront shell: navbar, footer, cart drawer, chat widget
    │   │   ├── page.tsx                   # Homepage: hero, featured games, reviews, trust
    │   │   ├── loading.tsx
    │   │   │
    │   │   ├── games/
    │   │   │   ├── page.tsx               # All games grid
    │   │   │   └── [slug]/
    │   │   │       ├── page.tsx           # Game overview with all services
    │   │   │       ├── loading.tsx
    │   │   │       └── [serviceSlug]/
    │   │   │           ├── page.tsx       # Service detail + dynamic order configurator
    │   │   │           └── loading.tsx
    │   │   │
    │   │   ├── cart/
    │   │   │   └── page.tsx               # Full cart page (also accessible via drawer)
    │   │   │
    │   │   ├── checkout/
    │   │   │   ├── page.tsx               # Checkout: login/guest, payment method, coupon
    │   │   │   └── success/
    │   │   │       └── page.tsx           # Order confirmation + next steps
    │   │   │
    │   │   ├── track/
    │   │   │   └── [orderNumber]/
    │   │   │       └── [trackToken]/
    │   │   │           └── page.tsx       # Public order tracking (requires orderNumber + trackToken)
    │   │   │
    │   │   ├── reviews/
    │   │   │   └── page.tsx               # All public reviews with filters
    │   │   │
    │   │   ├── leaderboard/
    │   │   │   └── page.tsx               # Public worker leaderboard
    │   │   │
    │   │   ├── faq/
    │   │   │   └── page.tsx               # FAQ (content from admin CMS)
    │   │   │
    │   │   ├── tos/
    │   │   │   └── page.tsx               # Terms of Service
    │   │   │
    │   │   ├── privacy/
    │   │   │   └── page.tsx               # Privacy Policy
    │   │   │
    │   │   └── apply/
    │   │       └── page.tsx               # Worker application form (public)
    │   │
    │   ├── (auth)/                        # AUTHENTICATION
    │   │   ├── layout.tsx                 # Centered card layout
    │   │   ├── login/
    │   │   │   └── page.tsx               # Email + Discord OAuth login
    │   │   ├── register/
    │   │   │   └── page.tsx               # Registration with optional referral code
    │   │   ├── forgot-password/
    │   │   │   └── page.tsx
    │   │   ├── reset-password/
    │   │   │   └── page.tsx
    │   │   ├── verify/
    │   │   │   └── page.tsx               # Email verification
    │   │   └── callback/
    │   │       └── route.ts               # OAuth callback handler (Discord)
    │   │
    │   ├── (customer)/                    # CUSTOMER DASHBOARD
    │   │   ├── layout.tsx                 # Dashboard shell: sidebar, header, notifications
    │   │   ├── loading.tsx
    │   │   │
    │   │   ├── dashboard/
    │   │   │   └── page.tsx               # Overview: active orders, recent activity
    │   │   │
    │   │   ├── orders/
    │   │   │   ├── page.tsx               # All orders with filters + search
    │   │   │   └── [id]/
    │   │   │       ├── page.tsx           # Order detail: progress, chat, credentials
    │   │   │       └── review/
    │   │   │           └── page.tsx       # Write review (after completion)
    │   │   │
    │   │   ├── wallet/
    │   │   │   └── page.tsx               # Balance, transaction history, top-up
    │   │   │
    │   │   ├── referrals/
    │   │   │   └── page.tsx               # Referral link, stats, earnings
    │   │   │
    │   │   ├── loyalty/
    │   │   │   └── page.tsx               # Loyalty points, rewards, redemption
    │   │   │
    │   │   └── settings/
    │   │       ├── page.tsx               # Profile settings
    │   │       ├── security/
    │   │       │   └── page.tsx           # Password, 2FA, sessions
    │   │       └── notifications/
    │   │           └── page.tsx           # Email/Discord notification preferences
    │   │
    │   ├── (worker)/                      # WORKER/BOOSTER DASHBOARD
    │   │   ├── layout.tsx                 # Worker dashboard shell
    │   │   ├── loading.tsx
    │   │   │
    │   │   ├── dashboard/
    │   │   │   └── page.tsx               # Stats: earnings, completed, rating, tier progress
    │   │   │
    │   │   ├── orders/
    │   │   │   ├── page.tsx               # Available orders (filtered by tier + games)
    │   │   │   ├── active/
    │   │   │   │   └── page.tsx           # Currently claimed orders
    │   │   │   ├── history/
    │   │   │   │   └── page.tsx           # Completed order history
    │   │   │   └── [id]/
    │   │   │       └── page.tsx           # Order execution: progress updater, chat, details
    │   │   │
    │   │   ├── earnings/
    │   │   │   ├── page.tsx               # Earnings overview + charts
    │   │   │   └── payouts/
    │   │   │       └── page.tsx           # Payout history + request payout
    │   │   │
    │   │   ├── games/
    │   │   │   └── page.tsx               # Manage which games they boost
    │   │   │
    │   │   └── settings/
    │   │       ├── page.tsx               # Profile, avatar
    │   │       └── payout/
    │   │           └── page.tsx           # Payout method configuration
    │   │
    │   ├── (admin)/                       # ADMIN PANEL
    │   │   ├── layout.tsx                 # Admin shell: sidebar, header, search (⌘K)
    │   │   ├── loading.tsx
    │   │   │
    │   │   ├── dashboard/
    │   │   │   └── page.tsx               # KPIs, revenue chart, order volume, conversion
    │   │   │
    │   │   ├── orders/
    │   │   │   ├── page.tsx               # All orders: filterable table, bulk actions
    │   │   │   └── [id]/
    │   │   │       └── page.tsx           # Order detail: full control, assign worker, refund
    │   │   │
    │   │   ├── games/
    │   │   │   ├── page.tsx               # All games: drag-to-reorder, activate/deactivate
    │   │   │   ├── categories/
    │   │   │   │   └── page.tsx           # Service categories CRUD (admin-defined types)
    │   │   │   ├── new/
    │   │   │   │   └── page.tsx           # Add new game
    │   │   │   └── [id]/
    │   │   │       ├── page.tsx           # Edit game details
    │   │   │       └── services/
    │   │   │           ├── page.tsx       # All services for this game
    │   │   │           ├── new/
    │   │   │           │   └── page.tsx   # Create service with form builder
    │   │   │           └── [serviceId]/
    │   │   │               └── page.tsx   # Edit service, pricing matrix, form config
    │   │   │
    │   │   ├── workers/
    │   │   │   ├── page.tsx               # All workers: tier, rating, status, earnings
    │   │   │   ├── tiers/
    │   │   │   │   └── page.tsx           # Tier management: create, edit, reorder, delete
    │   │   │   ├── applications/
    │   │   │   │   └── page.tsx           # Pending worker applications
    │   │   │   └── [id]/
    │   │   │       └── page.tsx           # Worker detail: promote/demote, notes, history
    │   │   │
    │   │   ├── customers/
    │   │   │   ├── page.tsx               # All customers: spend, orders, status
    │   │   │   └── [id]/
    │   │   │       └── page.tsx           # Customer detail: orders, balance, notes
    │   │   │
    │   │   ├── finance/
    │   │   │   ├── page.tsx               # Revenue dashboard: charts, totals, margins
    │   │   │   ├── transactions/
    │   │   │   │   └── page.tsx           # All payment transactions
    │   │   │   └── payouts/
    │   │   │       └── page.tsx           # Worker payouts: pending, process, history
    │   │   │
    │   │   ├── marketing/
    │   │   │   ├── coupons/
    │   │   │   │   ├── page.tsx           # All coupons
    │   │   │   │   └── new/
    │   │   │   │       └── page.tsx       # Create coupon
    │   │   │   ├── referrals/
    │   │   │   │   └── page.tsx           # Referral program settings + stats
    │   │   │   ├── affiliates/
    │   │   │   │   ├── page.tsx           # All affiliates
    │   │   │   │   ├── new/
    │   │   │   │   │   └── page.tsx       # Create affiliate
    │   │   │   │   └── [id]/
    │   │   │   │       └── page.tsx       # Affiliate detail: links, conversions, payouts
    │   │   │   └── loyalty/
    │   │   │       ├── page.tsx           # Loyalty program configuration
    │   │   │       └── tiers/
    │   │   │           └── page.tsx       # Loyalty tiers CRUD (admin-defined)
    │   │   │
    │   │   ├── helpdesk/
    │   │   │   ├── page.tsx               # All support tickets
    │   │   │   ├── [id]/
    │   │   │   │   └── page.tsx           # Ticket detail + conversation
    │   │   │   └── settings/
    │   │   │       └── page.tsx           # AI provider config, canned responses, SLA
    │   │   │
    │   │   ├── content/
    │   │   │   ├── pages/
    │   │   │   │   └── page.tsx           # Manage static pages (FAQ, TOS, Privacy)
    │   │   │   ├── banners/
    │   │   │   │   └── page.tsx           # Promo banners with scheduling
    │   │   │   └── announcements/
    │   │   │       └── page.tsx           # Site-wide announcements
    │   │   │
    │   │   ├── storefront/
    │   │   │   ├── page.tsx               # Storefront customization overview
    │   │   │   ├── theme/
    │   │   │   │   └── page.tsx           # Colors, fonts, logo, dark/light mode
    │   │   │   └── layout-editor/
    │   │   │       └── page.tsx           # Homepage section ordering + visibility
    │   │   │
    │   │   ├── discord/
    │   │   │   └── page.tsx               # Discord integration: channels, roles, notifications
    │   │   │
    │   │   ├── import/
    │   │   │   └── page.tsx               # Bulk order import (CSV upload + mapping)
    │   │   │
    │   │   ├── activity/
    │   │   │   └── page.tsx               # Full activity/audit log viewer
    │   │   │
    │   │   └── settings/
    │   │       ├── page.tsx               # General settings
    │   │       ├── payments/
    │   │       │   └── page.tsx           # Stripe, PayPal, other processor config
    │   │       ├── api-keys/
    │   │       │   └── page.tsx           # API key management (create, revoke, permissions)
    │   │       ├── notifications/
    │   │       │   └── page.tsx           # Email + Discord notification config
    │   │       ├── security/
    │   │       │   └── page.tsx           # 2FA enforcement, IP whitelist, session mgmt
    │   │       └── email/
    │   │           └── page.tsx           # Email template customization
    │   │
    │   └── api/
    │       ├── webhooks/
    │       │   ├── stripe/
    │       │   │   └── route.ts           # Stripe payment webhook
    │       │   ├── paypal/
    │       │   │   └── route.ts           # PayPal payment webhook
    │       │   └── discord/
    │       │       └── route.ts           # Discord interaction webhook
    │       │
    │       ├── checkout/
    │       │   └── route.ts               # Create checkout session (Stripe/PayPal/balance)
    │       │
    │       ├── orders/
    │       │   ├── route.ts               # List/create orders
    │       │   └── [id]/
    │       │       ├── route.ts           # Get/update order
    │       │       ├── claim/
    │       │       │   └── route.ts       # Worker claims order
    │       │       ├── progress/
    │       │       │   └── route.ts       # Update order progress
    │       │       ├── complete/
    │       │       │   └── route.ts       # Mark order as completed
    │       │       └── messages/
    │       │           └── route.ts       # Order chat messages
    │       │
    │       ├── helpdesk/
    │       │   ├── route.ts               # Create/list tickets
    │       │   ├── [id]/
    │       │   │   └── route.ts           # Ticket detail + messages
    │       │   └── ai/
    │       │       └── route.ts           # AI auto-response endpoint
    │       │
    │       ├── loyalty/
    │       │   ├── route.ts               # Get points balance
    │       │   └── redeem/
    │       │       └── route.ts           # Redeem points for reward
    │       │
    │       ├── affiliates/
    │       │   ├── route.ts               # Affiliate tracking
    │       │   └── click/
    │       │       └── route.ts           # Track affiliate link clicks
    │       │
    │       ├── import/
    │       │   └── route.ts               # Bulk CSV order import
    │       │
    │       ├── external/
    │       │   └── v1/
    │       │       ├── orders/
    │       │       │   └── route.ts       # External API: orders
    │       │       ├── games/
    │       │       │   └── route.ts       # External API: games catalog
    │       │       └── status/
    │       │           └── route.ts       # External API: order status
    │       │
    │       ├── upload/
    │       │   └── route.ts               # Presigned URL generation for file uploads
    │       │
    │       └── cron/
    │           ├── payouts/
    │           │   └── route.ts           # Weekly automatic payout processing
    │           ├── cleanup/
    │           │   └── route.ts           # Expire unpaid orders, clear old data
    │           ├── loyalty/
    │           │   └── route.ts           # Monthly loyalty point expiration
    │           └── worker-tiers/
    │               └── route.ts           # Auto-promote/demote workers based on stats
    │
    ├── components/
    │   │
    │   ├── ui/                            # shadcn/ui base (customized)
    │   │   ├── accordion.tsx
    │   │   ├── alert.tsx
    │   │   ├── avatar.tsx
    │   │   ├── badge.tsx
    │   │   ├── breadcrumb.tsx
    │   │   ├── button.tsx
    │   │   ├── calendar.tsx
    │   │   ├── card.tsx
    │   │   ├── checkbox.tsx
    │   │   ├── collapsible.tsx
    │   │   ├── command.tsx               # ⌘K search palette base
    │   │   ├── data-table.tsx            # TanStack Table wrapper
    │   │   ├── data-table-column-header.tsx
    │   │   ├── data-table-faceted-filter.tsx
    │   │   ├── data-table-pagination.tsx
    │   │   ├── data-table-toolbar.tsx
    │   │   ├── data-table-view-options.tsx
    │   │   ├── date-picker.tsx
    │   │   ├── date-range-picker.tsx
    │   │   ├── dialog.tsx
    │   │   ├── dropdown-menu.tsx
    │   │   ├── form.tsx                  # React Hook Form wrapper
    │   │   ├── input.tsx
    │   │   ├── label.tsx
    │   │   ├── popover.tsx
    │   │   ├── progress.tsx
    │   │   ├── radio-group.tsx
    │   │   ├── scroll-area.tsx
    │   │   ├── select.tsx
    │   │   ├── separator.tsx
    │   │   ├── sheet.tsx
    │   │   ├── skeleton.tsx
    │   │   ├── slider.tsx
    │   │   ├── switch.tsx
    │   │   ├── table.tsx
    │   │   ├── tabs.tsx
    │   │   ├── textarea.tsx
    │   │   ├── toast.tsx
    │   │   ├── toaster.tsx
    │   │   ├── tooltip.tsx
    │   │   └── use-toast.ts
    │   │
    │   ├── providers/                     # Context providers
    │   │   ├── index.tsx                  # Combined provider wrapper
    │   │   ├── query-provider.tsx         # TanStack Query provider
    │   │   ├── theme-provider.tsx         # Dynamic storefront theme
    │   │   ├── auth-provider.tsx          # Supabase auth context
    │   │   ├── notification-provider.tsx  # Real-time notification listener
    │   │   └── cart-provider.tsx          # Cart state hydration
    │   │
    │   ├── layouts/                       # Layout shells
    │   │   ├── storefront-navbar.tsx
    │   │   ├── storefront-footer.tsx
    │   │   ├── dashboard-sidebar.tsx      # Shared sidebar (adapts per role)
    │   │   ├── dashboard-header.tsx       # Shared header with search + notifications
    │   │   ├── dashboard-breadcrumbs.tsx
    │   │   └── mobile-nav.tsx
    │   │
    │   ├── storefront/                    # Storefront-specific components
    │   │   ├── hero-section.tsx           # Animated hero with dynamic content
    │   │   ├── game-card.tsx              # Game card with hover effects
    │   │   ├── game-grid.tsx
    │   │   ├── service-card.tsx
    │   │   ├── service-list.tsx
    │   │   ├── service-configurator.tsx   # Dynamic order form from form_config
    │   │   ├── price-calculator.tsx       # Live price calculation display
    │   │   ├── price-matrix-selector.tsx  # Rank-to-rank or level-to-level picker
    │   │   ├── review-card.tsx
    │   │   ├── review-carousel.tsx
    │   │   ├── review-stats.tsx           # Aggregate rating display
    │   │   ├── trust-badges.tsx           # Payment methods, security, guarantees
    │   │   ├── testimonial-section.tsx
    │   │   ├── promo-banner.tsx           # Scheduled promotional banners
    │   │   ├── announcement-bar.tsx       # Site-wide announcement strip
    │   │   ├── cart-drawer.tsx            # Slide-out cart
    │   │   ├── cart-item.tsx
    │   │   ├── cart-summary.tsx
    │   │   ├── checkout-form.tsx
    │   │   ├── payment-method-selector.tsx
    │   │   ├── coupon-input.tsx           # Coupon code validator
    │   │   ├── order-tracker.tsx          # Visual progress timeline
    │   │   ├── order-tracker-public.tsx   # Simplified for public tracking page
    │   │   ├── leaderboard-table.tsx      # Public worker leaderboard
    │   │   ├── leaderboard-card.tsx       # Top 3 worker highlight cards
    │   │   ├── faq-accordion.tsx
    │   │   └── worker-application-form.tsx
    │   │
    │   ├── chat/                          # Chat & messaging
    │   │   ├── chat-window.tsx            # Full chat interface
    │   │   ├── chat-message.tsx           # Individual message bubble
    │   │   ├── chat-input.tsx             # Message input with file upload
    │   │   ├── chat-file-preview.tsx
    │   │   ├── chat-system-message.tsx    # System messages (status changes)
    │   │   ├── live-chat-widget.tsx       # Floating support chat button
    │   │   ├── live-chat-window.tsx       # Support chat overlay
    │   │   └── typing-indicator.tsx
    │   │
    │   ├── helpdesk/                      # AI-powered helpdesk
    │   │   ├── ticket-list.tsx
    │   │   ├── ticket-detail.tsx
    │   │   ├── ticket-form.tsx
    │   │   ├── ai-response-badge.tsx      # Indicator that response is AI-generated
    │   │   ├── ai-suggestion-panel.tsx    # AI suggested responses for agents
    │   │   └── canned-response-picker.tsx
    │   │
    │   ├── dashboard/                     # Shared dashboard components
    │   │   ├── stat-card.tsx              # KPI card with trend indicator
    │   │   ├── stat-card-skeleton.tsx
    │   │   ├── chart-revenue.tsx          # Revenue line/bar chart
    │   │   ├── chart-orders.tsx           # Order volume chart
    │   │   ├── chart-conversion.tsx       # Conversion funnel
    │   │   ├── chart-worker-performance.tsx
    │   │   ├── activity-feed.tsx          # Recent activity timeline
    │   │   ├── activity-item.tsx
    │   │   ├── notification-bell.tsx      # Notification dropdown
    │   │   ├── notification-item.tsx
    │   │   ├── search-command.tsx         # ⌘K global search
    │   │   └── date-range-filter.tsx
    │   │
    │   ├── admin/                         # Admin-specific components
    │   │   ├── game-form.tsx              # Game create/edit form
    │   │   ├── service-form.tsx           # Service create/edit with form builder
    │   │   ├── service-form-builder.tsx   # Visual form field configurator
    │   │   ├── service-category-form.tsx  # Service category CRUD
    │   │   ├── price-matrix-editor.tsx    # Visual price matrix grid editor
    │   │   ├── coupon-form.tsx
    │   │   ├── affiliate-form.tsx
    │   │   ├── worker-tier-badge.tsx
    │   │   ├── worker-tier-editor.tsx     # Drag-to-change tier
    │   │   ├── worker-tier-crud.tsx       # Create/edit/delete/reorder tiers
    │   │   ├── worker-tier-form.tsx       # Tier form: name, color, icon, commission, limits
    │   │   ├── worker-application-review.tsx
    │   │   ├── theme-editor.tsx           # Live preview theme customizer
    │   │   ├── theme-color-picker.tsx
    │   │   ├── layout-section-editor.tsx  # Homepage section ordering
    │   │   ├── payment-config-form.tsx
    │   │   ├── discord-config-form.tsx
    │   │   ├── api-key-form.tsx
    │   │   ├── api-key-table.tsx
    │   │   ├── email-template-editor.tsx
    │   │   ├── loyalty-config-form.tsx
    │   │   ├── loyalty-tier-form.tsx       # Loyalty tier CRUD
    │   │   ├── bulk-import-wizard.tsx     # CSV upload + column mapping + preview
    │   │   ├── bulk-import-preview.tsx
    │   │   ├── security-settings-form.tsx # 2FA, IP whitelist
    │   │   ├── activity-log-table.tsx
    │   │   └── payout-processor.tsx       # Batch payout approval interface
    │   │
    │   ├── worker/                        # Worker-specific components
    │   │   ├── available-order-card.tsx   # Order card in available queue
    │   │   ├── available-order-filters.tsx
    │   │   ├── claim-confirmation.tsx     # Confirm before claiming
    │   │   ├── progress-updater.tsx       # Slider + notes for progress
    │   │   ├── progress-timeline.tsx
    │   │   ├── completion-form.tsx        # Completion checklist + proof upload
    │   │   ├── earnings-chart.tsx
    │   │   ├── earnings-breakdown.tsx
    │   │   ├── payout-request-form.tsx
    │   │   ├── payout-history-table.tsx
    │   │   ├── tier-progress-card.tsx     # Visual tier progression
    │   │   ├── tier-requirements.tsx
    │   │   ├── game-selector.tsx          # Toggle which games they boost
    │   │   └── worker-stats-grid.tsx
    │   │
    │   ├── customer/                      # Customer-specific components
    │   │   ├── order-card.tsx
    │   │   ├── order-detail-header.tsx
    │   │   ├── order-progress-display.tsx
    │   │   ├── credential-vault.tsx       # Encrypted credential input/display
    │   │   ├── review-form.tsx
    │   │   ├── referral-share-card.tsx
    │   │   ├── referral-stats.tsx
    │   │   ├── loyalty-points-card.tsx
    │   │   ├── loyalty-rewards-grid.tsx
    │   │   ├── wallet-balance-card.tsx
    │   │   └── wallet-transactions.tsx
    │   │
    │   └── shared/                        # Shared across all areas
    │       ├── logo.tsx                   # Responsive logo (adapts to theme)
    │       ├── theme-toggle.tsx
    │       ├── loading-spinner.tsx
    │       ├── loading-dots.tsx           # Animated dots (for chat)
    │       ├── empty-state.tsx            # Configurable empty state with illustration
    │       ├── error-boundary-card.tsx
    │       ├── confirm-dialog.tsx         # Reusable confirmation modal
    │       ├── file-upload.tsx            # Drag & drop + click upload
    │       ├── file-upload-preview.tsx
    │       ├── image-upload.tsx           # Image-specific with crop
    │       ├── rich-text-editor.tsx       # Tiptap wrapper
    │       ├── status-badge.tsx           # Order/payment/payout status
    │       ├── tier-badge.tsx             # Worker tier with icon + color
    │       ├── user-avatar.tsx            # Avatar with fallback initials
    │       ├── discord-avatar.tsx         # Discord-style avatar
    │       ├── currency-display.tsx       # Formatted currency
    │       ├── relative-time.tsx          # "2 hours ago" display
    │       ├── copy-button.tsx            # Click-to-copy with feedback
    │       ├── page-header.tsx            # Consistent page header
    │       ├── section-header.tsx
    │       ├── back-button.tsx
    │       └── pagination.tsx
    │
    ├── lib/
    │   │
    │   ├── supabase/
    │   │   ├── client.ts                  # Browser Supabase client
    │   │   ├── server.ts                  # Server component client (cookies)
    │   │   ├── admin.ts                   # Service role client (API routes)
    │   │   ├── middleware.ts              # Auth refresh helper for middleware
    │   │   └── types.ts                   # Re-export generated database types
    │   │
    │   ├── payments/
    │   │   ├── index.ts                   # Unified payment interface
    │   │   ├── stripe.ts                  # Stripe: checkout, refund, webhook verify
    │   │   ├── paypal.ts                  # PayPal: create order, capture, webhook verify
    │   │   └── balance.ts                # Internal balance: deduct, credit, validate
    │   │
    │   ├── discord/
    │   │   ├── api.ts                     # REST calls to Discord API (from webapp)
    │   │   └── embeds.ts                  # Embed builder helpers (shared with bot)
    │   │
    │   ├── email/
    │   │   ├── client.ts                  # Resend SDK setup
    │   │   ├── send.ts                    # Unified send function with template lookup
    │   │   └── templates/
    │   │       ├── base-layout.tsx        # Shared email layout
    │   │       ├── order-confirmed.tsx
    │   │       ├── order-assigned.tsx
    │   │       ├── order-in-progress.tsx
    │   │       ├── order-completed.tsx
    │   │       ├── payment-received.tsx
    │   │       ├── worker-payout.tsx
    │   │       ├── worker-approved.tsx
    │   │       ├── worker-application.tsx
    │   │       ├── welcome.tsx
    │   │       ├── password-reset.tsx
    │   │       ├── referral-reward.tsx
    │   │       └── ticket-response.tsx
    │   │
    │   ├── ai/
    │   │   ├── index.ts                   # AI provider factory (configurable)
    │   │   ├── providers/
    │   │   │   ├── openai.ts              # OpenAI adapter
    │   │   │   ├── anthropic.ts           # Anthropic adapter
    │   │   │   └── types.ts              # Shared AI provider interface
    │   │   ├── helpdesk-agent.ts          # Helpdesk AI logic + system prompt
    │   │   └── auto-responder.ts          # Auto-response for common questions
    │   │
    │   ├── encryption/
    │   │   ├── index.ts                   # AES-256-GCM encrypt/decrypt
    │   │   └── credentials.ts             # Account credential vault helpers
    │   │
    │   ├── api/
    │   │   ├── middleware.ts              # API route helpers: auth check, rate limit
    │   │   ├── errors.ts                  # Standardized API error responses
    │   │   ├── validate.ts                # Zod validation wrapper for API routes
    │   │   └── external-auth.ts           # API key authentication for external API
    │   │
    │   ├── utils/
    │   │   ├── cn.ts                      # clsx + tailwind-merge
    │   │   ├── format.ts                  # formatCurrency, formatDate, formatNumber
    │   │   ├── constants.ts               # App-wide constants (tiers, statuses, etc.)
    │   │   ├── order-number.ts            # Generate order numbers client-side (display)
    │   │   ├── slugify.ts                 # URL-safe slug generation
    │   │   ├── csv-parser.ts              # CSV parsing for bulk import
    │   │   └── debounce.ts
    │   │
    │   ├── validators/
    │   │   ├── auth.ts                    # Login, register, password reset schemas
    │   │   ├── order.ts                   # Order creation, update schemas
    │   │   ├── game.ts                    # Game create/edit schemas
    │   │   ├── service.ts                 # Service create/edit schemas
    │   │   ├── service-category.ts        # Service category schemas
    │   │   ├── coupon.ts                  # Coupon schemas
    │   │   ├── worker.ts                  # Worker application, update schemas
    │   │   ├── worker-tier.ts             # Tier create/edit schemas
    │   │   ├── loyalty.ts                 # Loyalty config schemas
    │   │   ├── loyalty-tier.ts            # Loyalty tier schemas
    │   │   ├── affiliate.ts               # Affiliate schemas
    │   │   ├── helpdesk.ts                # Ticket schemas
    │   │   ├── settings.ts                # Settings schemas
    │   │   └── import.ts                  # CSV import validation schemas
    │   │
    │   └── config/
    │       ├── site.ts                    # Static site metadata
    │       ├── navigation.ts              # Nav items per role (customer, worker, admin)
    │       ├── tiers.ts                   # Tier helpers (loaded from DB, not hardcoded)
    │       ├── order-statuses.ts          # Status definitions, colors, allowed transitions
    │       └── permissions.ts             # Role-based permission matrix
    │
    ├── hooks/
    │   ├── use-auth.ts                    # Current user + role helpers
    │   ├── use-cart.ts                    # Cart actions (backed by Zustand)
    │   ├── use-realtime.ts                # Generic Supabase realtime subscription
    │   ├── use-realtime-order.ts          # Order-specific realtime updates
    │   ├── use-realtime-notifications.ts  # Notification listener
    │   ├── use-notifications.ts           # Notification state + mark read
    │   ├── use-storefront-theme.ts        # Dynamic theme CSS variable injection
    │   ├── use-site-settings.ts           # Cached site settings fetcher
    │   ├── use-debounce.ts
    │   ├── use-media-query.ts
    │   ├── use-clipboard.ts
    │   └── use-file-upload.ts             # Upload to Supabase Storage
    │
    ├── stores/
    │   ├── cart-store.ts                  # Zustand: cart items, coupon, totals
    │   ├── notification-store.ts          # Zustand: unread count, notification list
    │   └── ui-store.ts                    # Zustand: sidebar collapsed, modals, etc.
    │
    └── types/
        ├── database.ts                    # Auto-generated from Supabase (npx supabase gen types)
        ├── order.ts                       # Order-related types + enums
        ├── game.ts                        # Game + service types
        ├── worker.ts                      # Worker + tier types
        ├── payment.ts                     # Payment + payout types
        ├── helpdesk.ts                    # Ticket types
        ├── loyalty.ts                     # Loyalty program types
        ├── affiliate.ts                   # Affiliate types
        ├── notification.ts                # Notification types
        └── api.ts                         # API response wrapper types


discord-bot/                               # SEPARATE SERVICE (runs on VPS)
├── package.json
├── tsconfig.json
├── Dockerfile
├── .env
│
└── src/
    ├── index.ts                           # Bot entry point + Supabase realtime setup
    │
    ├── commands/
    │   ├── index.ts                       # Command registry + loader
    │   ├── claim.ts                       # /claim <order-number>
    │   ├── unclaim.ts                     # /unclaim <order-number>
    │   ├── progress.ts                    # /progress <order-number> <percentage> [notes]
    │   ├── complete.ts                    # /complete <order-number>
    │   ├── status.ts                      # /status <order-number>
    │   ├── stats.ts                       # /stats — worker's own stats
    │   ├── leaderboard.ts                 # /leaderboard — top workers
    │   ├── lookup.ts                      # /lookup <order-number> — admin only
    │   ├── assign.ts                      # /assign <order-number> <worker> — admin only
    │   └── payout.ts                      # /payout — request payout
    │
    ├── events/
    │   ├── ready.ts                       # On bot ready: sync roles, register commands
    │   ├── interaction-create.ts          # Command + button interaction handler
    │   └── member-join.ts                 # Auto-assign customer role
    │
    ├── services/
    │   ├── supabase.ts                    # Supabase client (service role)
    │   ├── order-sync.ts                  # Realtime: DB changes → Discord notifications
    │   ├── role-sync.ts                   # Sync worker tiers to Discord roles
    │   ├── notifications.ts               # Send embeds to configured channels
    │   └── ticket-bridge.ts               # Bridge helpdesk tickets to Discord threads
    │
    └── lib/
        ├── embeds.ts                      # Rich embed builders (order, review, payout)
        ├── buttons.ts                     # Button row builders (claim, view, etc.)
        ├── permissions.ts                 # Role-based command access control
        ├── logger.ts                      # Structured logging
        └── constants.ts                   # Channel IDs, role IDs (from site_settings)
```

---

## 4. Database Schema

```sql
-- =============================================
-- ENUMS
-- =============================================
CREATE TYPE user_role AS ENUM ('customer', 'worker', 'admin', 'super_admin');
CREATE TYPE order_status AS ENUM (
  'pending_payment', 'paid', 'queued', 'claimed',
  'in_progress', 'paused', 'completed', 'cancelled',
  'refunded', 'disputed'
);
-- NOTE: Worker tiers are NOT an enum. They are fully dynamic via the
-- worker_tiers table below. Admin can create, rename, reorder, and
-- customize tiers with any name, color, icon, and commission rate.
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE payout_status AS ENUM ('pending', 'processing', 'completed', 'failed');
-- NOTE: service_type is NOT an enum. Service categories are dynamic
-- via the service_categories table. Admin creates categories like
-- "Leveling", "Rank Boost", "Coaching", etc.
CREATE TYPE discount_type AS ENUM ('percentage', 'fixed');
CREATE TYPE ticket_status AS ENUM ('open', 'awaiting_reply', 'in_progress', 'resolved', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- =============================================
-- PROFILES (extends Supabase Auth)
-- =============================================
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

-- =============================================
-- WORKER TIERS (fully dynamic, admin-defined)
-- =============================================
CREATE TABLE worker_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                            -- admin chooses: "Rookie", "Pro", "Legend", etc.
  slug TEXT UNIQUE NOT NULL,                     -- auto-generated from name
  color TEXT DEFAULT '#6366f1',                  -- hex color for badges
  icon TEXT DEFAULT '⭐',                        -- emoji or icon name
  sort_order INT DEFAULT 0,                      -- display + hierarchy order (0 = lowest)
  commission_rate DECIMAL(5,4) DEFAULT 0.5500,   -- e.g. 0.5500 = 55%
  max_active_orders INT DEFAULT 2,
  min_completed_orders INT DEFAULT 0,            -- auto-promote threshold
  min_rating DECIMAL(3,2) DEFAULT 0,             -- auto-promote threshold
  is_invite_only BOOLEAN DEFAULT FALSE,          -- admin manually assigns
  is_default BOOLEAN DEFAULT FALSE,              -- new workers get this tier
  discord_role_id TEXT,                          -- linked Discord role
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- No seed data — admin creates tiers from the admin panel.
-- A default tier (is_default = true) must be created before workers can be verified.

-- =============================================
-- WORKERS
-- =============================================
CREATE TABLE workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  tier_id UUID REFERENCES worker_tiers(id),      -- dynamic tier reference
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
  -- e.g.: { "ranks": ["Iron","Bronze",...], "levels": {"min":1,"max":100} }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SERVICE CATEGORIES (fully dynamic, admin-defined)
-- =============================================
CREATE TABLE service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                            -- "Leveling", "Rank Boost", "Coaching", etc.
  slug TEXT UNIQUE NOT NULL,
  icon TEXT,                                     -- emoji or icon name
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
  category_id UUID REFERENCES service_categories(id),  -- dynamic category
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
  -- Dynamic form fields:
  -- [
  --   { "id":"current_rank","type":"select","label":"Current Rank",
  --     "options":["Iron","Bronze","Silver","Gold"],"required":true },
  --   { "id":"desired_rank","type":"select","label":"Desired Rank",
  --     "options":[...],"required":true },
  --   { "id":"duo_queue","type":"checkbox","label":"Duo Queue (+40%)",
  --     "price_modifier":1.4 },
  --   { "id":"priority","type":"checkbox","label":"Priority Order (+25%)",
  --     "price_modifier":1.25 },
  --   { "id":"stream","type":"checkbox","label":"Live Stream (+20%)",
  --     "price_modifier":1.2 }
  -- ]
  price_matrix JSONB,
  -- { "Iron→Bronze": 5.00, "Bronze→Silver": 8.00, ... }
  min_worker_tier_id UUID REFERENCES worker_tiers(id),  -- minimum tier to claim
  estimated_hours DECIMAL(6,2),
  worker_payout_override DECIMAL(5,4),
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, slug)
);

-- =============================================
-- ORDERS
-- =============================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  track_token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::TEXT, -- public tracking token (unguessable)
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
  payout_hold_until TIMESTAMPTZ,   -- escrow/review window ends at this time
  paid_out_at TIMESTAMPTZ,         -- set when included in a payout batch
  payout_id UUID,                  -- optional link to payouts.id (set by cron processor)
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
  expires_at TIMESTAMPTZ,  -- auto-cancel if unpaid
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-increment order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'BST-' || LPAD(
    nextval('order_number_seq')::TEXT, 6, '0'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE order_number_seq START 1;
CREATE TRIGGER set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW WHEN (NEW.order_number IS NULL)
  EXECUTE FUNCTION generate_order_number();

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
-- ORDER STATUS HISTORY (audit trail)
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

-- =============================================
-- COUPONS
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
-- REFERRAL REWARDS
-- =============================================
CREATE TABLE referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES profiles(id),
  referred_id UUID REFERENCES profiles(id),
  order_id UUID REFERENCES orders(id),
  reward_amount DECIMAL(10,2) NOT NULL,
  referred_reward DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','credited','expired')),
  credited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- AFFILIATES
-- =============================================
CREATE TABLE affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE REFERENCES profiles(id),
  company_name TEXT,
  website_url TEXT,
  affiliate_code TEXT UNIQUE NOT NULL DEFAULT nanoid(10),
  commission_rate DECIMAL(5,4) DEFAULT 0.0800,  -- 8% default
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
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- LOYALTY PROGRAM
-- =============================================

-- Loyalty tiers (fully dynamic, admin-defined)
CREATE TABLE loyalty_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                            -- "Bronze Member", "VIP", etc.
  slug TEXT UNIQUE NOT NULL,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT '⭐',
  min_lifetime_points INT DEFAULT 0,             -- threshold to reach this tier
  bonus_multiplier DECIMAL(3,2) DEFAULT 1.00,    -- points earning multiplier
  perks TEXT,                                    -- description of tier perks
  sort_order INT DEFAULT 0,
  is_default BOOLEAN DEFAULT FALSE,              -- new users get this tier
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  points INT DEFAULT 0,
  lifetime_points INT DEFAULT 0,
  tier_id UUID REFERENCES loyalty_tiers(id),      -- dynamic loyalty tier
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id),
  points INT NOT NULL,  -- positive = earned, negative = spent
  reason TEXT NOT NULL,  -- 'order_earned','redeemed','expired','bonus','refund'
  reference_id UUID,     -- order_id or reward_id
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  points_cost INT NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('discount_percentage','discount_fixed','free_addon')),
  reward_value DECIMAL(10,2) NOT NULL,
  max_redemptions INT,
  current_redemptions INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- HELPDESK TICKETS
-- =============================================
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
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

-- Auto-increment ticket number
CREATE SEQUENCE ticket_number_seq START 1;
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_number := 'TKT-' || LPAD(nextval('ticket_number_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER set_ticket_number
  BEFORE INSERT ON tickets FOR EACH ROW
  WHEN (NEW.ticket_number IS NULL)
  EXECUTE FUNCTION generate_ticket_number();

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
    "order_expiry_hours": 24
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
    "roles": {
      "customer": ""
    },
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
    "ai_system_prompt": "You are a helpful support agent for a game boosting service...",
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
-- API KEYS (for external integrations)
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
-- INDEXES (performance)
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
CREATE INDEX idx_messages_order ON order_messages(order_id);
CREATE INDEX idx_reviews_worker ON reviews(worker_id);
CREATE INDEX idx_reviews_game ON reviews(game_id);
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
```
### 4.A Public order tracking hardening (anti-bruteforce)

Because `order_number` is sequential (`BST-000001`, `BST-000002`, …), public tracking must require a second, **unguessable** token.

Implementation:
- `orders.track_token` is generated automatically on insert.
- Public route: `/track/[orderNumber]/[trackToken]` (or alternatively `/track/[orderNumber]?t=[trackToken]`).
- Tracking page fetches the order by **both** `order_number` + `track_token`; if not found → `404`.
- Apply rate limiting / bot protection on the public tracking route.

### 4.B Credentials vault hardening (security critical)

The credential vault (`account_credentials_encrypted`) is the highest-risk part of the system and must be treated as such.

- **Key management / rotation:** encrypt using AES-256-GCM and include a `key_id`/version in the ciphertext format so keys can rotate without breaking old orders. Keep previous keys available **only** for decryption.
- **Access control:** decrypt **server-side only** (Route Handler / Server Action / Edge Function) using server-only secrets (service role). Never decrypt in client code.
- **RLS:** ensure only the customer, the assigned worker, and admins can read/write the encrypted credential field (workers should only read when `worker_id = auth.uid()` and the order is claimed).
- **Log scrubbing:** never log credentials (plaintext **or** ciphertext) and never forward them to Discord. Add redaction in error/log helpers.
- **Least retention:** automatically wipe `account_credentials_encrypted` after completion/cancellation, or after a fixed TTL (e.g. 30 days) via `/api/cron/cleanup`.

### 4.C Money-flow: escrow/hold, disputes/chargebacks, automated payouts

Define explicit rules so payouts cannot double-pay and disputes cannot leak money.

**Escrow / hold window**
- On `completed`, set `payout_hold_until = completed_at + REVIEW_WINDOW` (configurable in `site_settings.general`, e.g. `payout_review_window_hours`).
- Orders are payout-eligible only when:
  - `status = 'completed'`
  - `payout_hold_until <= now()`
  - `paid_out_at IS NULL`
  - not `refunded` / not `disputed`

**Disputes & chargebacks**
- Any processor dispute/chargeback webhook moves the order to `disputed` and freezes payout eligibility.
- If a dispute/chargeback happens **after** payout, record an admin-visible clawback/adjustment decision and reconcile the worker balance (policy decision: recover from future earnings vs manual resolution).

**Automated payouts (cron)**
- Weekly `/api/cron/payouts` selects eligible, unpaid orders, groups per worker, creates a `payouts` record, then sets `orders.paid_out_at` (and optionally `orders.payout_id`).
- Cron must be idempotent (DB advisory lock and/or a "processing" marker) to prevent double-processing.


---

## 5. Worker Tier System

Tiers are **100% dynamic**. Admin creates, renames, reorders, and configures tiers from the admin panel. Nothing is hardcoded.

```
worker_tiers table — admin controls everything:

┌─────────────────────────────────────────────────────────────────────┐
│ name       │ color   │ icon │ commission │ max_active │ auto-promo  │
├─────────────────────────────────────────────────────────────────────┤
│ (custom)   │ (hex)   │ (emoji) │ (%)     │ (int)      │ orders+rating│
│                                                                     │
│ Admin creates all tiers from scratch. No pre-filled data.           │
│ A default tier (is_default = true) must exist before workers can    │
│ be verified. The admin panel guides the user through initial setup. │
└─────────────────────────────────────────────────────────────────────┘

Key features:
- Admin creates any number of tiers with any names
- sort_order determines hierarchy (0 = lowest tier)
- is_invite_only = true means admin manually assigns (no auto-promote)
- is_default = true means new verified workers get this tier
- Each tier links to a Discord role for auto-sync
- Auto-promotion cron checks min_completed_orders + min_rating
- Admin can always manually promote/demote
- Services set min_worker_tier_id to restrict who can claim
```

---

## 6. AI Helpdesk Integration

```typescript
// lib/ai/index.ts — Configurable AI provider factory
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import type { AIProvider } from './providers/types';

export function createAIProvider(settings: HelpdeskSettings): AIProvider {
  switch (settings.ai_provider) {
    case 'openai':
      return new OpenAIProvider(settings.ai_api_key, settings.ai_model);
    case 'anthropic':
      return new AnthropicProvider(settings.ai_api_key, settings.ai_model);
    default:
      throw new Error(`Unknown AI provider: ${settings.ai_provider}`);
  }
}

// lib/ai/providers/types.ts — Shared interface
export interface AIProvider {
  generateResponse(params: {
    systemPrompt: string;
    conversationHistory: Array<{ role: string; content: string }>;
    userMessage: string;
  }): Promise<{
    content: string;
    confidence: number;
    tokensUsed: number;
  }>;
}
```

Admin configures via the helpdesk settings page:
- Which AI provider to use (OpenAI, Anthropic, or none)
- Which model (selectable from dropdown)
- API key (encrypted)
- System prompt (customizable)
- Auto-respond toggle + confidence threshold
- Canned responses for common questions

---

## 7. External API (for third-party integrations)

```
Base URL: /api/external/v1

Authentication: Bearer token (API key from admin panel)
Rate limit: configurable per key (default 100/hour)

Endpoints:
  GET  /games                    — List all active games
  GET  /games/:slug/services     — List services for a game
  POST /orders                   — Create an order
  GET  /orders/:number           — Get order status
  GET  /orders/:number/progress  — Get order progress

Response format:
{
  "success": true,
  "data": { ... },
  "meta": { "timestamp": "...", "request_id": "..." }
}
```

---

## 8. UI/UX Design Guidelines

```
AESTHETIC:
  Dark, premium, gaming-adjacent but NOT "gamer cringe"
  Think: Stripe dashboard quality meets gaming culture
  Professional, trustworthy, premium feel

TYPOGRAPHY:
  --font-heading: 'Cal Sans', sans-serif      (distinctive, geometric)
  --font-body: 'Satoshi', sans-serif           (clean, modern, readable)
  --font-mono: 'JetBrains Mono', monospace     (order numbers, codes, data)
  NEVER: Inter, Roboto, Arial, system fonts

COLORS (default, admin-customizable):
  --bg-primary: #09090b          (zinc-950, deep dark)
  --bg-secondary: #18181b        (zinc-900)
  --bg-card: #1c1c24             (custom, slightly warm)
  --bg-elevated: #27272a         (zinc-800)
  --color-primary: #6366f1       (indigo-500)
  --color-secondary: #8b5cf6     (violet-500)
  --color-accent: #f59e0b        (amber-500, for CTAs)
  --color-success: #22c55e       (green-500)
  --color-warning: #eab308       (yellow-500)
  --color-error: #ef4444         (red-500)
  --text-primary: #f4f4f5        (zinc-100)
  --text-secondary: #a1a1aa      (zinc-400)
  --text-muted: #71717a          (zinc-500)
  --border-subtle: rgba(255,255,255,0.06)
  --border-default: rgba(255,255,255,0.1)

EFFECTS:
  Glassmorphism: backdrop-blur-xl + bg-white/5 (subtle, on elevated cards)
  Glow: box-shadow with primary color at 15-20% opacity on hover
  Gradients: very subtle, only on hero and CTA sections
  Noise texture: optional grain overlay on hero section

INTERACTIONS:
  Buttons: scale(0.98) on active, smooth color transition on hover
  Cards: border-color transition + translateY(-2px) on hover
  Page transitions: Framer Motion, fade + slide, 200ms
  Skeletons: for ALL loading states (never spinners)
  Toasts: bottom-right, auto-dismiss, Sonner-style
  Command palette (⌘K): global search across orders, customers, games

RESPONSIVE:
  Mobile-first design
  Dashboard sidebar collapses to bottom nav on mobile
  Cart drawer instead of full cart page on mobile
  Touch-friendly: min 44px tap targets

EMPTY STATES:
  Custom illustration + clear CTA for every empty list
  Examples: "No orders yet — browse our services", 
            "No workers assigned — applications are open"
```

---

## 9. Cursor Rules (.cursor/rules)

```markdown
# Project: BoostPlatform — Game Boosting Service

## Stack
- Next.js 14 (App Router) + TypeScript strict mode
- Tailwind CSS 3.4 + shadcn/ui (customized dark theme)
- Supabase (auth, DB, RLS, Realtime, Storage)
- Stripe + PayPal (unified payment interface)
- Zustand (client state) + TanStack Query v5 (server state)
- React Hook Form + Zod (forms + validation)
- Framer Motion (animations + page transitions)
- TanStack Table v8 (data tables with sorting, filtering, pagination)
- Tiptap (rich text editor for admin CMS)
- Recharts (charts and graphs)
- cmdk (command palette)
- Resend + React Email (transactional emails)

## Architecture
- /app/(storefront)/ → Public webshop (SSR for SEO)
- /app/(customer)/ → Customer dashboard (protected)
- /app/(worker)/ → Worker/booster dashboard (protected, role: worker)
- /app/(admin)/ → Admin panel (protected, role: admin/super_admin)
- /app/api/ → API routes (webhooks, checkout, CRUD, external API)
- /discord-bot/ → Separate Discord bot service (Node.js on VPS)
- /supabase/migrations/ → Database migrations (version controlled)

## Design Rules
1. Dark mode default. Deep dark backgrounds (#09090b), indigo primary, amber CTAs
2. NEVER use generic AI aesthetics (no Inter font, no purple gradients on white)
3. Use 'Cal Sans' for headings, 'Satoshi' for body text, 'JetBrains Mono' for data
4. Subtle glassmorphism on elevated cards (backdrop-blur-xl + bg-white/5)
5. Glow effects on interactive elements (box-shadow with primary at 15% opacity)
6. Skeleton loaders for ALL loading states — NEVER use spinners
7. Framer Motion for page transitions (fade + slide, 200ms)
8. All empty states must have a custom illustration + clear CTA
9. Mobile-first responsive. Min 44px tap targets
10. Make it look like a senior designer built it, not AI

## Code Rules
1. TypeScript strict mode — no `any` types, no type assertions unless necessary
2. Server Components by default, Client Components only when needed ('use client')
3. ALL database queries via server components or API routes, never client-side direct
4. Supabase RLS on ALL tables — always verify auth in API routes too
5. Zod schemas for ALL form validation AND API input validation
6. Error boundaries on every route group (error.tsx)
7. Loading states on every route group (loading.tsx)
8. TanStack Query for client-side data fetching (staleTime: 30s default)
9. ALL price calculations server-side (never trust client calculations)
10. Sensitive data (tokens, credentials, API keys) always encrypted at rest
11. Activity logging for ALL admin actions
12. Optimistic updates for real-time features (order progress, chat)

## File Naming
- Components: PascalCase (GameCard.tsx, ServiceConfigurator.tsx)
- Utilities: camelCase (formatCurrency.ts, slugify.ts)
- Types: PascalCase (OrderStatus, WorkerTier)
- Validators: camelCase matching entity (order.ts, game.ts)
- Database columns: snake_case (order_status, tier_id)
- API routes: kebab-case paths (/api/orders/[id]/claim)
- CSS variables: kebab-case (--color-primary, --bg-card)

## Component Patterns
- Use composition over prop drilling
- Shared UI components in /components/ui/
- Domain components in /components/{domain}/
- Each component file exports ONE default component
- Co-locate component-specific types in the same file
- Use forwardRef for interactive components that may need refs

## Data Fetching Patterns
- Server Components: direct Supabase queries (createServerClient)
- Client Components: TanStack Query hooks calling API routes
- Mutations: TanStack Query useMutation with optimistic updates
- Real-time: Supabase Realtime subscriptions via custom hooks
- Pagination: cursor-based for infinite scroll, offset for data tables

## Security Checklist (verify for every feature)
- [ ] RLS policy exists for the table
- [ ] API route checks auth (getUser())
- [ ] API route validates input (Zod)
- [ ] Sensitive data is encrypted
- [ ] Admin actions are logged to activity_log
- [ ] Rate limiting on public endpoints
- [ ] CSRF protection via Supabase auth tokens
- [ ] No secrets in client-side code
```

---

## 10. Build Order for Cursor

Build in this sequence. Each block depends on the previous.

```
STEP 1 — FOUNDATION
├── Initialize Next.js 14 + TypeScript strict
├── Install all dependencies
├── Tailwind + shadcn/ui setup with custom dark theme
├── Custom fonts (Cal Sans, Satoshi, JetBrains Mono)
├── CSS variables for dynamic theming
├── Supabase project setup + all migrations
├── Auth setup (email + password + Discord OAuth)
├── Middleware (role-based route protection)
├── Provider wrappers (query, auth, theme, notifications)
├── Type generation from Supabase schema
├── Base layout components (navbar, sidebar, footer)
└── Shared UI components (button, card, badge, table, etc.)

STEP 2 — ADMIN CORE
├── Admin layout shell (sidebar, header, ⌘K search)
├── Admin dashboard (KPI cards, revenue chart, order chart)
├── Service categories CRUD (admin defines types)
├── Games CRUD (list, create, edit, reorder, activate/deactivate)
├── Services CRUD per game (form builder, price matrix editor)
├── Worker tiers CRUD (create, rename, reorder, set commission/limits)
├── Loyalty tiers CRUD (create, rename, set thresholds/multipliers)
├── Worker management (list, detail, tier assignment)
├── Worker application review (approve/reject)
├── Customer management (list, detail, order history)
└── Activity log viewer

STEP 3 — STOREFRONT
├── Homepage with all sections (hero, games, reviews, trust, FAQ)
├── Dynamic theming from site_settings
├── Game listing + detail pages
├── Service detail + dynamic order configurator
│   ├── Form rendered from form_config JSON
│   ├── Live price calculation with modifiers
│   └── Price matrix selector (rank/level pickers)
├── Cart (Zustand store + drawer + full page)
├── Checkout flow (auth, payment method, coupon input)
├── Order confirmation + public tracking page
├── Public reviews page + leaderboard page
├── Worker application page
└── FAQ + TOS + Privacy pages

STEP 4 — PAYMENTS
├── Stripe checkout + webhook handler
├── PayPal checkout + webhook handler
├── Balance payment processing
├── Coupon validation + discount calculation
├── Referral code tracking + reward crediting
├── Affiliate click tracking + conversion recording
├── Loyalty points earning on order completion
└── Order expiry (auto-cancel unpaid)

STEP 5 — CUSTOMER DASHBOARD
├── Customer dashboard (orders, wallet, referrals, loyalty, settings)
├── Order detail (progress timeline, chat, credential vault, review)
├── Real-time notifications via Supabase Realtime
└── All chat/messaging (order messages, real-time)

STEP 6 — WORKER DASHBOARD
├── Worker dashboard (stats, earnings, tier progress)
├── Available orders (filtered by tier + games)
├── Order claiming + active order management
├── Progress updater + completion flow
├── Earnings overview + payout management
└── Worker game selection + settings

STEP 7 — DISCORD BOT
├── Discord bot setup + command registration
├── Realtime order sync → Discord channels
├── Slash commands (claim, progress, complete, status, stats)
├── Role sync (worker tiers → Discord roles)
└── DM notifications for customers

STEP 8 — HELPDESK + AI
├── Helpdesk ticket system (create, list, detail, messages)
├── AI integration (configurable provider, auto-response)
└── Live chat widget on storefront

STEP 9 — ADVANCED ADMIN
├── Storefront customization (theme editor, sections, banners)
├── Coupon CRUD + affiliate management
├── Loyalty program configuration + rewards
├── Payment processor settings + API key management
├── Discord integration settings
├── Email templates + notification settings
├── Security settings (2FA, IP whitelist)
├── Worker payout processing (batch approve)
├── Bulk order import (CSV wizard)
├── Finance dashboard
└── External API (v1 endpoints + API key auth + rate limiting)

STEP 10 — CRON JOBS
├── Worker payout processing
├── Worker tier auto-promotion/demotion
├── Order expiry cleanup
├── Loyalty points expiration
└── Affiliate click/conversion aggregation

STEP 11 — POLISH
├── Framer Motion page transitions
├── Micro-interactions on all interactive elements
├── Responsive design audit (mobile, tablet, desktop)
├── SEO (meta tags, OG images, sitemap.xml, robots.txt)
├── Performance (lazy loading, code splitting, image optimization)
├── Error handling (error.tsx on all routes)
├── Loading states (skeletons on all routes)
├── Empty state illustrations
├── Toast notifications for all actions
└── Security audit (RLS, encryption, validation)
```

---

## 11. Environment Variables

```env
# ─── Supabase ───
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# ─── App ───
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_APP_NAME=BoostPlatform

# ─── Stripe ───
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=
STRIPE_WEBHOOK_SECRET=

# ─── PayPal ───
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_WEBHOOK_ID=
NEXT_PUBLIC_PAYPAL_CLIENT_ID=

# ─── Discord (for OAuth in webapp) ───
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=

# ─── Email (Resend) ───
RESEND_API_KEY=
EMAIL_FROM=noreply@yourdomain.com

# ─── Encryption ───
CREDENTIALS_ENCRYPTION_KEY=              # 32 bytes hex, for account credentials
SETTINGS_ENCRYPTION_KEY=                 # 32 bytes hex, for API keys in settings

# ─── Cron (Vercel cron jobs) ───
CRON_SECRET=

# ─── Discord Bot (separate .env in /discord-bot) ───
# DISCORD_BOT_TOKEN=
# DISCORD_GUILD_ID=
# SUPABASE_URL=
# SUPABASE_SERVICE_ROLE_KEY=
```
