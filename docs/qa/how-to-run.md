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

## Safety: destructive actions are blocked

`tests/utils/destructive-guard.ts` installs a route handler and a click
guard that abort any request matching destructive patterns
(`/delete`, `/payouts`, `/transfers`, Stripe charges, Twilio sends,
SES sends, …) and any button labelled `delete`, `transfer`, `payout`,
`broadcast`, etc. Every Playwright spec wires this guard via the
`signedInPage` fixture.
