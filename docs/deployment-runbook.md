# Goglish — Deployment & Go-Live Runbook

Phase 12 companion doc. Everything here that's a **code change** has already
landed (CI, CSRF, rate limiting, `next/image`, sitemap/robots, RLS, etc.) —
see the PR history for those. This doc covers the remaining checklist items
that require a human with account access, real traffic, or a paid plan:
Vercel/Supabase production setup, monitoring, backups, load testing, and the
final go-live checklist. It also records two findings that were investigated
and deliberately *not* acted on, so the reasoning isn't lost.

---

## 1. Vercel Production Configuration

### Environment variables

Set these in **Vercel → Project → Settings → Environment Variables**, scoped
per environment (Production / Preview / Development). Values come from the
Supabase project dashboard and each payment/video provider's dashboard —
none of them belong in git (`.env.local.example` documents the shape only).

| Variable | Production source | Preview |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production Supabase project URL | Point at a **staging** Supabase project, not prod |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production project's anon key | Staging project's anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Production project's service-role key | Staging project's service-role key |
| `NEXT_PUBLIC_SITE_URL` | `https://<your-domain>` | Vercel's auto preview URL (`$VERCEL_URL`, or leave unset) |
| `NATIONAL_ID_ENCRYPTION_KEY` | Fresh 32-byte key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | Different key from prod — never share this key across environments |
| `BUNNY_LIBRARY_ID`, `BUNNY_TOKEN_AUTH_KEY` | Real Bunny Stream account | Bunny's sandbox/test library if available, else staging library |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe **live** key + a webhook endpoint pointed at the prod domain | Stripe **test** key |
| `PAYMOB_HMAC_SECRET`, `VODAFONE_CASH_HMAC_SECRET`, `INSTAPAY_HMAC_SECRET`, `KASHER_HMAC_SECRET` | Real merchant secrets from each provider (these four are still Interface+Stub — wire up real accounts before enabling in prod, see `lib/payments/stub.provider.ts`) | Leave as stub/test values |
| `TAX_RATE_PERCENT` | `14` (Egyptian VAT) | `14` |
| `RECONCILE_SECRET`, `USER_HARD_DELETE_SECRET` | Fresh random strings, must match the corresponding value baked into the `pg_cron` job in the matching migration (`supabase/migrations/20260727110010_reconciliation_cron.sql`, `..._user_hard_delete_cron.sql`) | Same as prod is fine — these gate cron→API calls, not user data |

**Never** set `SUPABASE_SERVICE_ROLE_KEY` or the encryption/cron secrets with
`NEXT_PUBLIC_` prefixes — they'd ship to the browser bundle.

### Preview deployments

- Vercel's default behavior (every PR gets a preview URL) is what we want —
  no extra config needed beyond the Preview-scoped env vars above.
- Point preview deployments at a **separate staging Supabase project**, not
  production. A preview build running the real migrations/seed data against
  prod would be a data-integrity risk for a throwaway branch deploy.
- CSRF protection (`proxy.ts`'s Origin check) already works correctly
  against Vercel's per-preview domains — the check compares the request's
  `Origin` header against the request's own `Host`, not a hardcoded domain,
  so it needs no per-preview-URL configuration.

### Domain & headers

- Attach the production domain in Vercel → Domains, and set
  `NEXT_PUBLIC_SITE_URL` to match exactly (it feeds `app/sitemap.ts`,
  `app/robots.ts`, and Open Graph metadata in `app/layout.tsx`).
- Vercel terminates TLS and sets HSTS automatically for custom domains — no
  action needed.

---

## 2. Supabase Production Checklist

### Upgrade to Pro before real launch

The free tier pauses projects after a week of inactivity and caps daily
backups/log retention — **not viable for a live product**. Upgrade to Pro
(or higher) before onboarding real users. This unlocks:

- Daily automated backups with **Point-in-Time Recovery** (see §4 — the
  in-app "تصدير نسخة احتياطية" button on `/admin/backups` is a manual JSON
  export for admin convenience, it is *not* a substitute for PITR).
- No project pausing.
- Higher log retention (needed for §3's monitoring).
- Higher connection/rate limits on Auth and the Postgres pooler.

### RLS audit (verified against the live local schema, 2026-07-26)

Ran directly against the `public` schema in the local Supabase Postgres
instance (not just read from migration files, to catch anything a later
migration might have silently reverted):

```sql
select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r';
-- 69 tables

select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity = false;
-- (0 rows) — every table has RLS enabled
```

**Result: 69/69 tables have RLS enabled.** Two of them —
`payment_webhook_events` and `rate_limit_counters` — have RLS enabled but
**zero policies**, which means `anon`/`authenticated` roles get a hard
deny on every operation; only `SUPABASE_SERVICE_ROLE_KEY` (which bypasses
RLS entirely) can touch them. That's intentional: both are
admin-client-only internal bookkeeping tables (raw webhook payloads, rate
limit counters), never read or written through a user session. Confirmed
correct, not a gap.

Before go-live, re-run that second query against the **production**
project once all migrations are applied there — it's a 5-second check that
catches "someone added a table and forgot RLS" with certainty a code review
can miss.

### Auth settings

- Confirm **Email confirmations required** stays enabled in prod (Auth →
  Providers → Email) — the register flow (`app/api/auth/register/route.ts`)
  is written assuming `signUpData.session` is null until confirmed.
- Set the **Site URL** and **Redirect URLs** in Auth settings to the real
  production domain (`https://<domain>/auth/callback`) — the register route
  builds `emailRedirectTo` from the request's own origin, but Supabase Auth
  also independently allow-lists redirect URLs server-side.
- Rotate `SUPABASE_SERVICE_ROLE_KEY` if it was ever pasted anywhere outside
  Vercel's env var UI (chat, a doc, a screenshot) before go-live.

### Storage

- Confirm the storage buckets used for teacher/media uploads have the same
  public/private access split they have locally (course thumbnails public,
  raw video sources private — Bunny handles the actual video CDN delivery,
  Supabase Storage is only for images/PDFs per `lib/storage/`).

---

## 3. Monitoring Setup

No third-party APM was introduced (matches the spec's ask for
Vercel/Supabase-native tooling, not a new paid vendor):

- **Vercel Analytics** — enable in Vercel → Project → Analytics. Zero code
  change needed for the basic Web Vitals + traffic view; if page-level
  custom events become useful later, add `@vercel/analytics`'s `<Analytics
  />` to `app/layout.tsx`.
- **Vercel Logs** (Runtime Logs tab) — this is where `console.error` calls
  from API routes surface in prod. Skim it after every deploy for the first
  hour.
- **Supabase Logs** (Dashboard → Logs) — Postgres, Auth, and API logs are
  all there. The `audit_logs` table (`app/(admin)/admin/audit-logs`) is a
  separate, app-level audit trail for user-facing actions (logins, content
  reviews, refunds) — it complements but doesn't replace Supabase's own
  infra logs.
- **Alerting**: Supabase's Pro plan includes basic project health alerts
  (CPU, disk, connection count) out of the box once upgraded — no extra
  setup. Vercel doesn't alert on errors by default; if that's needed later,
  a simple option is a Vercel Log Drain into a webhook, but that's out of
  scope for this pass since it needs a destination (Slack webhook, etc.)
  that doesn't exist yet.

---

## 4. Backup Automation

- **Database**: comes from the Supabase Pro upgrade (§2) — daily automatic
  backups + PITR, no app code involved.
- **Manual export**: `/admin/backups` (built in Phase 11) lets an admin
  trigger an on-demand JSON export of core tables for one-off situations
  (e.g., before a risky manual migration). This is a convenience layer, not
  the backup strategy itself.
- **Storage/media**: Supabase Storage buckets are covered by the same
  project-level backup once on Pro. Bunny-hosted video is Bunny's own
  responsibility/SLA — Goglish never holds the source video files.

---

## 5. Load Testing

Not run against live infrastructure in this pass — there's no production
(or production-like, sized) environment to point load at yet, and load
testing a shared/free-tier Supabase project would risk hitting connection
limits that look like outages rather than useful signal. Recommended
approach once a Pro-tier staging environment exists:

1. Use `k6` or `autocannon` against the staging deployment (not local dev —
   `next dev` and a local single-container Postgres don't reflect prod
   performance characteristics at all).
2. Priority endpoints to target, in order of expected traffic concentration:
   - `GET /api/courses`, `GET /api/courses/[id]` (browse — cache-friendly,
     good baseline)
   - `POST /api/auth/login` (rate-limited — confirm the limit itself
     doesn't buckle under burst, and that legitimate concurrent logins
     during a "class starts now" moment aren't false-positived)
   - `GET /api/lessons/[id]/playback` (the device single-stream check in
     `lib/services/device.service.ts` adds a read+write per call — worth
     confirming it doesn't become a hot lock under concurrent access from
     the same popular lesson)
   - `POST /api/orders/[id]/pay` (payment rate limit is 3/10min/user by
     design, so this one should be tested for correctness under
     concurrency — two simultaneous requests for the same order — rather
     than raw throughput)
3. Watch Supabase's connection pooler metrics during the run, not just
   response latency — Postgres connection exhaustion is the more likely
   failure mode than CPU for this app's shape (many short-lived
   RLS-checked queries).

---

## 6. Known Findings (investigated, not code changes)

### `npm audit`: 15 pre-existing advisories, none from new Phase 12 packages

`npm audit` reports 3 moderate + 12 high severity findings, all inside the
`eslint` / `next` / `postcss` / `sharp` / `@modelcontextprotocol/sdk`
dependency chains — confirmed via `npm audit --json` that none originate
from `@playwright/test` (the only package Phase 12 added).
`npm audit fix --force` proposes downgrading `next` from `16.2.11` to
`9.3.3` to resolve a transitively-nested `postcss`/`sharp` advisory — that
downgrade would be far more dangerous than the vulnerabilities it "fixes"
(losing 7 major versions of the framework this app is built on). Left
as-is; recommend re-running `npm audit` after each routine `next`/`eslint`
minor bump, since these are upstream-pinned transitive deps that'll clear
on their own as those projects update their own pins.

### ISR / static regeneration — scoped down from the original ask

The Phase 12 request asked for "Next.js ISR / Static Regeneration بدل
Redis." Most of Phases 8–11's authenticated surface (dashboards, courses
browse, admin/teacher/parent portals) is built as client-rendered pages
(`"use client"` + React Query), which is the right call for
personalized/role-gated data but means there isn't a large body of
public, cacheable pages where server-side ISR would apply today. Retrofitting
true ISR would mean restructuring several pages from client- to
server-rendered — a real architectural change, disproportionate to a
polish/hardening phase and risky to do without dedicated regression testing
per page. What *is* already cache-friendly: `app/sitemap.ts` and the public
marketing pages (`/`, `/courses`, `/teachers/[id]`) are plain Server
Components with no `"use client"` boundary forcing client rendering, so
Next's default full-route-cache behavior already applies to them without
extra config. Recommend treating a deliberate ISR pass (picking specific
public routes, adding `revalidate` values, verifying cache invalidation on
content changes) as its own follow-up task rather than folding it silently
into this phase.

---

## 7. Go-Live Checklist

- [ ] Vercel production env vars set (§1), preview env vars point at a
      staging Supabase project, not prod
- [ ] Custom domain attached in Vercel, `NEXT_PUBLIC_SITE_URL` matches
- [ ] Supabase project upgraded to Pro (or higher) — **do this before**
      onboarding real users, not after
- [ ] All migrations applied to the production Supabase project
      (`supabase db push` or via CI/CD, not manual dashboard SQL)
- [ ] Re-run the RLS zero-policy query from §2 against production
- [ ] Auth → Email confirmations enabled, Site URL / Redirect URLs set to
      the real domain
- [ ] Real payment provider credentials wired in (Stripe live keys at
      minimum; Paymob/Vodafone Cash/InstaPay/Kasher remain Interface+Stub
      until real merchant accounts exist — confirm which gateways are
      actually live before enabling their buttons in the checkout UI)
- [ ] Real Bunny Stream account + library configured, `BUNNY_LIBRARY_ID`/
      `BUNNY_TOKEN_AUTH_KEY` updated
- [ ] Vercel Analytics enabled
- [ ] CI green on `main` (lint, build, Vitest, Playwright — all four jobs
      in `.github/workflows/ci.yml`)
- [ ] Smoke-test the golden paths manually against the production URL once
      live: register → confirm → login, browse → buy (small real
      transaction) → watch a lesson, teacher upload → admin approve
- [ ] Confirm rate limits (`login`, `register`, `payment`) behave
      correctly against production Postgres, not just local
- [ ] `NATIONAL_ID_ENCRYPTION_KEY` is a freshly generated production-only
      value, backed up somewhere secure outside Vercel (losing it makes
      every stored national ID unrecoverable — see
      `lib/services/national-id.service.ts`)
