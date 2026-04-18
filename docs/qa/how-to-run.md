# How to run the bug-surfacing campaign

This page is the single source of truth for re-running the multi-profile
Playwright + k6 campaign that produces
`docs/qa/bug-surfacing-report.md`.

## Prerequisites

- Node.js 20+
- [k6](https://k6.io/docs/getting-started/installation/) on your `$PATH`
- One Playwright browser bundle: `npx playwright install --with-deps chromium`

## Environment variables

Set these before running. **Never commit real credentials** — use the
Replit secrets flow or your shell's env.

| Variable | Purpose |
|---|---|
| `E2E_BASE_URL` | Base URL of the environment under test (defaults to `http://localhost:5173`). **Must point at our own environment.** |
| `LOAD_BASE_URL` | Same, for k6 (defaults to `E2E_BASE_URL` value). |
| `QA_EMAIL_USER`, `QA_EMAIL_PASSWORD` | Email-confirmed test account. |
| `QA_PHONE_NUMBER`, `QA_OTP_BYPASS_TOKEN` | Phone-OTP test account + dev-only OTP bypass. |
| `QA_ADMIN_EMAIL`, `QA_ADMIN_PASSWORD` | Super-admin test account. |
| `QA_EMPTY_EMAIL`, `QA_EMPTY_PASSWORD` | Account seeded with no data. |
| `QA_HEAVY_EMAIL`, `QA_HEAVY_PASSWORD` | Account seeded with heavy data. |
| `E2E_WORKERS` | Playwright worker count (default 6). |
| `E2E_SHARDED` | Set to `1` to add Firefox + WebKit projects. |
| `LOAD_PROFILE` | Tag attached to k6 metrics for breakdown by profile. |

### Account naming convention

All test accounts are named `qa+<role>@easy-locs.test` (e.g.
`qa+admin@easy-locs.test`). They are dedicated to QA, never linked to
real PII, and live only in the staging environment. Rotate by updating
the env vars above; no code change required.

## One-shot: full campaign

```bash
# 1. Start small (single shard, 6 workers, Chromium only)
E2E_BASE_URL="$E2E_BASE_URL" npm run test:e2e

# 2. Once green, scale up
E2E_WORKERS=14 E2E_SHARDED=1 npm run test:e2e

# 3. Staged load: smoke → load → stress, gated on thresholds
LOAD_BASE_URL="$E2E_BASE_URL" npm run test:load:staged

# 4. Build the consolidated report
npm run qa:report

# Open the report
open docs/qa/bug-surfacing-report.md
```

`tests/load/run-staged.sh` only advances to the next stage when the
previous one passes the configured thresholds (`http_req_failed < 1%`,
`http_req_duration p95 < 800ms`).

## Adjusting concurrency

- **Playwright workers**: change `E2E_WORKERS`. First pass: 5–8. Stable
  pass: 12–16.
- **k6 VUs**: edit the `stages` array in `tests/load/{smoke,load,stress}.js`.

## Rotating test-account credentials

1. Rotate the password / OTP token in the auth provider.
2. Update the corresponding `QA_*` secret in Replit (or your CI).
3. Re-run step 1 of the campaign — no code change needed.

## Provisioning the 5 QA accounts on staging

Run these once on the **staging** Supabase project (not production).
All commands assume you have `psql` connected to the staging DB and
`supabase` CLI authenticated for the staging project.

### 0. Pick the staging URL

Set `E2E_BASE_URL` to the public URL of the staging deployment, e.g.
`https://staging.easy-locs.app`. This is the only target the campaign
ever hits.

### 1. Create the four email/password accounts

```bash
# Replace <STAGING_PROJECT_REF> and pick fresh strong passwords.
# Use the same domain for all five (qa+<role>@easy-locs.test) so they
# stay easy to recognise and easy to nuke later.

for role in user admin empty heavy; do
  supabase --project-ref <STAGING_PROJECT_REF> \
    auth users create "qa+${role}@easy-locs.test" \
    --password "$(openssl rand -base64 24)" \
    --email-confirm
done
```

Capture each generated password into the matching Replit secret:

| Role  | Email                          | Secret pair                                   |
|---|---|---|
| user  | `qa+user@easy-locs.test`       | `QA_EMAIL_USER` / `QA_EMAIL_PASSWORD`         |
| admin | `qa+admin@easy-locs.test`      | `QA_ADMIN_EMAIL` / `QA_ADMIN_PASSWORD`        |
| empty | `qa+empty@easy-locs.test`      | `QA_EMPTY_USER` / `QA_EMPTY_PASSWORD`         |
| heavy | `qa+heavy@easy-locs.test`      | `QA_HEAVY_USER` / `QA_HEAVY_PASSWORD`         |

### 2. Grant the admin account `super_admin`

Roles live in `public.user_roles` and admin checks use both the DB role
and the `VITE_ADMIN_ALLOWLIST` env var
(`src/hooks/useIsAdmin.ts`, `supabase/migrations/20260417500000_super_admin_role.sql`).

```sql
-- Run on staging DB.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::public.app_role
  FROM auth.users
 WHERE email = 'qa+admin@easy-locs.test'
ON CONFLICT (user_id, role) DO NOTHING;

-- Mirror in the allowlist table so the email-based check passes too.
INSERT INTO public.admin_allowlist (email)
VALUES ('qa+admin@easy-locs.test')
ON CONFLICT (email) DO NOTHING;
```

Also append `qa+admin@easy-locs.test` to `VITE_ADMIN_ALLOWLIST` in the
staging build config (Vercel/Cloudflare → environment variables).

### 3. Configure the phone-OTP account

OTP delivery (`supabase/functions/send-otp/index.ts`) honours an
`OTP_MOCK_MODE` env var on the Edge Function. When `true` (and the
project is **not** the production project) the 6-digit code is **not**
sent over Twilio — it is logged to the Edge Function logs.

We exploit this for tests:

1. In the staging Supabase project, set the Edge Function secret:
   ```bash
   supabase --project-ref <STAGING_PROJECT_REF> \
     functions secrets set OTP_MOCK_MODE=true
   ```
2. Pick a dedicated test phone number (E.164, e.g. `+15555550123`) — it
   does not need to be a real SIM because OTP is mocked. Store as
   `QA_PHONE_NUMBER`.
3. The campaign needs a deterministic OTP to type into the verify
   screen. Two options, in order of preference:

   - **Option A (preferred, no code change):** the test reads the most
     recent OTP from the `otp_codes` table directly:
     ```sql
     SELECT code FROM public.otp_codes
       WHERE phone = current_setting('app.test_phone')
       ORDER BY created_at DESC LIMIT 1;
     ```
     Set `QA_OTP_BYPASS_TOKEN` to a service-role JWT that has read
     access to `public.otp_codes` on staging.
   - **Option B (only if Option A is blocked by RLS):** add a single
     hard-coded bypass code (e.g. `424242`) in `verify-otp` gated on
     `Deno.env.get('OTP_BYPASS_TOKEN') === request.headers.get('x-qa-bypass')`.
     Set the same value as the Edge Function secret `OTP_BYPASS_TOKEN`
     **and** as `QA_OTP_BYPASS_TOKEN`. Keep this **off** in production.

### 4. Seed data for the `empty` and `heavy` accounts

The `empty` account requires **no** seeding — its purpose is to assert
empty-state UI. Just confirm it has zero rows in `orders`,
`notifications`, `wallet_transactions`.

The `heavy` account needs enough data to exercise pagination and lazy
loading. Minimum target:

| Table                  | Rows for `qa+heavy` |
|---|---:|
| `orders`               | 250                 |
| `notifications`        | 500                 |
| `wallet_transactions`  | 200                 |
| `properties` (if owner)| 30                  |

```sql
-- Templated; adapt column names to current schema.
INSERT INTO public.orders (user_id, status, total, created_at)
SELECT u.id, 'completed', (random()*1000)::numeric(10,2),
       now() - (random()*interval '180 days')
  FROM auth.users u, generate_series(1, 250)
 WHERE u.email = 'qa+heavy@easy-locs.test';
-- Repeat the pattern for notifications, wallet_transactions, properties.
```

### 5. Verify

```bash
# Smoke-test the credentials before the campaign run.
QA_EMAIL_USER=qa+user@easy-locs.test \
QA_EMAIL_PASSWORD='…' \
E2E_BASE_URL=https://staging.easy-locs.app \
npx playwright test tests/e2e/01-login-dashboard.spec.ts \
  --grep '@email-confirmed' --reporter=list
```

A green run here is the gate to the full matrix.

## Safety: destructive actions are blocked

`tests/utils/destructive-guard.ts` installs a route handler and a click
guard that abort any request matching destructive patterns
(`/delete`, `/payouts`, `/transfers`, Stripe charges, Twilio sends,
SES sends, …) and any button labelled `delete`, `transfer`, `payout`,
`broadcast`, etc. Every Playwright spec wires this guard via the
`signedInPage` fixture.
