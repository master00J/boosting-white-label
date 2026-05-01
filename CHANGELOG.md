# Changelog — BoostPlatform

Overzicht van recente wijzigingen. Datum in formaat JJJJ-MM-DD.

---

## 2026-03-03 — Table PATCH allowlist + Redis rate limiting

### Table PATCH: per-tabel allowlist
- **Nieuw:** `src/lib/table-patch-allowlist.ts` met toegestane kolommen per tabel.
- PATCH-requests naar `/api/admin/table/[table]` worden gefilterd op deze allowlist (voorkomt mass assignment).
- Voor `profiles`: `role` en `is_banned` blijven alleen wijzigbaar door `super_admin` (bestaande check behouden).

### Rate limiting: Redis (Upstash)
- **Nieuw:** `@upstash/ratelimit` en `@upstash/redis` toegevoegd.
- Indien `UPSTASH_REDIS_REST_URL` en `UPSTASH_REDIS_REST_TOKEN` gezet zijn: rate limiting via Redis (geschikt voor productie, multi-instance).
- Anders: in-memory fallback (zoals voorheen).
- `checkRateLimit` is nu async; alle call sites bijgewerkt.
- Env vars gedocumenteerd in `.env.example`.

---

## 2026-03-03 — ChatGPT Security Remediatie

Na analyse door ChatGPT zijn de volgende kritieke en high-priority punten aangepakt:

### Critical — Service role uit middleware (opgelost)

- **Voorheen:** Middleware gebruikte `SUPABASE_SERVICE_ROLE_KEY` voor role/ban-checks en profile-creatie op elk request.
- **Nu:** RLS-first: user-scoped client (`anon` key + session cookies) voor profile-select. Geen service role in middleware.
- **Profile-creatie bij ontbreken:** Redirect naar `/api/auth/ensure-profile?redirect=...` — dedicated route met service role (niet in request-hot path).
- `src/middleware.ts`, `src/lib/supabase/middleware.ts` (retourneert nu `supabase`), `src/app/api/auth/ensure-profile/route.ts` (nieuw)

### Critical — debug-auth endpoint

- Bestond niet in de huidige codebase (mogelijk al eerder verwijderd). Geen actie nodig.

### High — Customer data met admin client (opgelost)

- **Dashboard, orders, order-detail, referrals:** Nu user-scoped `createClient()` i.p.v. `createAdminClient()`.
- RLS doet de autorisatie; geen service role in customer-pagina's.
- `src/app/(customer)/dashboard/page.tsx`, `orders/page.tsx`, `orders/[id]/page.tsx`, `referrals/page.tsx`

### RLS-uitbreiding voor referrals

- `00040_referrals_rls.sql`: policy "Users can view referred profiles" (profiles waar referred_by = auth.uid()).
- Referral config keys toegevoegd aan public-readable site_settings.

### Mass assignment (deels)

- `/api/admin/coupons/[id]` en `/api/admin/payouts/[id]` hadden al Zod allowlists.
- De generieke `/api/admin/table/[table]` PATCH gebruikt nog volledige body; toekomstige verbetering: per-tabel schema/allowlist.

### Security hardening (2026-03-03 — vervolg)

Na een structurele security-analyse zijn de volgende fixes toegepast:

| Fix | Bestand | Omschrijving |
|-----|---------|--------------|
| **Redirect sanitization** | `api/auth/ensure-profile/route.ts` | Alleen relative paths (`/…`) toegestaan; geen open redirect via `//evil.com` of protocol. |
| **SVG upload blokkeren** | `api/admin/upload-image/route.ts`, `upload-image/signed-url/route.ts`, `image-upload.tsx` | Alleen JPEG, PNG, WebP (geen SVG wegens XSS-risico). MIME + extensie-allowlist. |
| **Rate limit doc** | `lib/rate-limit.ts` | Waarschuwing: in-memory niet geschikt voor productie; Upstash Redis aanbevolen. |

**Al aanwezig (geverifieerd):**
- Cron-trigger: `ALLOWED_JOBS` whitelist (`payouts`, `cleanup`, `loyalty`, `worker-tiers`)
- Table API: `ALLOWED_TABLES` whitelist; rolwijziging alleen voor `super_admin`
- ensure-profile: user uit session (cookies), geen body/query voor user-id

**Nog open (medium prioriteit):**
- Table PATCH: per-tabel Zod-schema/allowlist (grote refactor)
- Rate limiting: overstap naar Redis bij productie-schaal

### Audit-status (verificatie)

Na een follow-up audit (2026-03-03) zijn de volgende punten gecontroleerd. **Beide high-priority items zijn al geïmplementeerd** in de huidige codebase:

| Audit-bevinding        | Status | Verificatie |
|------------------------|--------|-------------|
| Cron-secret in frontend | ✅ Opgelost | Zie hieronder |
| Referrals RLS ontbreekt | ✅ Opgelost | Zie hieronder |
| Table PATCH allowlist  | 🔶 Nog open | Medium prioriteit |
| Stripe webhook casts   | 🔶 Low | Onderhoud |

**Cron-secret** — activity-client roept admin-route aan, geen secret in client:

```tsx
// src/app/(admin)/admin/activity/activity-client.tsx
const res = await fetch(`/api/admin/cron-trigger/${jobName}`, { method: "POST" });
```

De server-route `/api/admin/cron-trigger/[jobName]` verifieert sessie + gebruikt `CRON_SECRET` alleen server-side.

**Referrals RLS** — policy in `00040_referrals_rls.sql`:

```sql
CREATE POLICY "Users can view referred profiles" ON profiles
  FOR SELECT
  USING (referred_by = auth.uid());
```

---

## 2026-03-03 — Security, rate limiting & changelog

### Security

- **Cron-secret lek opgelost**  
  De Activity Log gebruikte `NEXT_PUBLIC_CRON_SECRET` in de browser; secrets met `NEXT_PUBLIC_` komen in de client-bundle en zijn zichtbaar. Nu gebruikt de app een admin-only route `/api/admin/cron-trigger/[jobName]` die de sessie controleert en de cron met server-side `CRON_SECRET` aanroept.  
  - `src/app/api/admin/cron-trigger/[jobName]/route.ts` (nieuw)  
  - `src/app/(admin)/admin/activity/activity-client.tsx` — roept nu de admin-route aan in plaats van de cron-API met een secret  
  - `NEXT_PUBLIC_CRON_SECRET` mag verwijderd worden uit `.env`.

- **Encryption keys veilig bewaren**  
  Toegevoegd in `.env.example`: waarschuwing dat `CREDENTIALS_ENCRYPTION_KEY` en `SETTINGS_ENCRYPTION_KEY` nooit gecommit mogen worden. `.env` staat al in `.gitignore`.

### Rate limiting

- **Rate limiting op API-routes**  
  In-memory rate limiter toegevoegd om brute force en misbruik te beperken:
  - `src/lib/rate-limit.ts` (nieuw) — generieke rate limit helper  
  - Checkout: 10 req/min per IP  
  - Helpdesk, affiliate apply: 5 req/min per IP  
  - Admin table API: 200 req/min per IP  

  Getroffen routes:  
  - `/api/checkout`  
  - `/api/helpdesk`  
  - `/api/affiliate/apply`  
  - `/api/admin/table/[table]`

  Voor grootschalige productie kan Upstash Redis overwogen worden voor gedeelde rate limits.

---

## 2026-03-03 — SEO-verbeteringen

### Sitemap

- Uitgebreid met services, boosters, track, apply, tos, privacy
- `src/app/sitemap.ts` bijgewerkt

### robots.txt

- Aanpassingen voor allow/disallow-regels
- `src/app/robots.ts` bijgewerkt

### Structured data (JSON-LD)

- Organization- en WebSite-schema toegevoegd
- `src/components/seo/json-ld.tsx` (nieuw)

### Metadata & Open Graph

- Canonical URLs en Open Graph voor game- en servicepagina’s
- `src/app/layout.tsx` — root layout, metadata, canonical
- `src/app/(storefront)/games/[slug]/page.tsx`
- `src/app/(storefront)/games/[slug]/[categorySlug]/[serviceSlug]/page.tsx`

---

## 2026-03 — Admin-toegang & rollen

### Admin Access

- Pagina **Settings → Admin Access** (`/admin/settings/admin-users`) waar super_admins admins beheren
- API: `/api/admin/admin-users` (GET, POST, PATCH)
- API: `/api/admin/promote-worker` (POST)
- Alleen **super_admin** mag rollen wijzigen; table API blokkeert rolwijzigingen voor niet-super_admin

### New Signups

- Pagina **Customers → New Signups** (`/admin/customers/new-signups`) met recente aanmeldingen (30 dagen)
- Filters: zoeken, alleen Discord-gebruikers
- Acties: direct Admin, Super Admin of Worker maken

### Staff Overview

- Dashboard hernoemd naar "Staff Overview"
- Admin/super_admin ziet "Staff Overview" in het user menu

### Super admin-rol

- Keuze tussen Admin en Super Admin bij toevoegen
- Rol aanpassen via dropdown per admin (behalve jezelf)

---

## 2026-03 — Auth & OAuth-fixes

### Redirect loop

- Session-cookies worden nu correct meegestuurd op de redirect-response in `/auth/callback`

### Ontbrekend profiel

- `ensureProfileExists()` in callback maakt profiel aan als trigger faalt (o.a. bij null email).
- Middleware redirectt nu naar `/api/auth/ensure-profile` i.p.v. zelf profile te creëren (service role uit middleware).

### OAuth error-URL

- Middleware verwijdert params zoals `error_code=bad_oauth_state` uit de URL

---

## Aanbevelingen (nog niet geïmplementeerd)

- **OG-afbeelding:** `og-image.png` (1200×630 px) toevoegen in `public/`
- **Meta velden:** `meta_title` en `meta_description` invullen voor games en services in admin
- **2FA:** Klanten-2FA staat gepland voor na de volledige lancering
