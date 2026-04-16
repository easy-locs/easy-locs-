# OWASP Top 10 (2021) — Coverage Checklist

Scoped to the Easy-Locs monorepo. Status:
✅ covered · ⚠ partial · ❌ gap · n/a not applicable.

## A01:2021 — Broken Access Control
- ✅ Supabase RLS enabled on sensitive tables (partial — audit pending per
  `rls-audit-checklist.md`).
- ✅ Edge functions use `requireAuthenticatedUser` / `requireServiceRole`
  (see `edge-functions-auth-inventory.md`).
- ⚠ 24 functions still in "public mode without auth wrapper" — must be
  classified (see inventory).
- ⚠ No automated negative-path regression suite for "user A reads user B".
- Action: ship RLS three-persona suite; move or whitelist the 24 public
  functions.

## A02:2021 — Cryptographic Failures
- ✅ HSTS preload, upgrade-insecure-requests.
- ✅ Orbit E2EE uses ECDH P-521 + AES-256-GCM + HKDF-SHA-512 with 96-bit
  random IVs, 128-bit auth tags, domain-separated info strings.
- ✅ Secrets stored in Replit Secrets / Supabase project secrets, not in
  source.
- ⚠ Key-rotation SOP only just documented (`secrets-rotation.md`).

## A03:2021 — Injection
- ✅ All DB access via Supabase-js (parameterised).
- ✅ `reject-query-secrets` middleware strips query-string secrets from
  logs / proxy forwards.
- ⚠ A handful of `innerHTML` sinks tracked in `docs/security-audit-2026-04-16.md`
  (H-2). Wrap via `safeSetHtml()` from `src/lib/utils/sanitize-html.ts`.
- n/a No raw SQL in client code.

## A04:2021 — Insecure Design
- ✅ E2EE design documents exist for Orbit (see `e2ee-orbit-audit.md`).
- ✅ Fraud engine (`src/lib/security/fraud-detection-engine.ts`) and OTP
  hardening.
- ⚠ Threat model document not yet merged — tracked in `docs/security/`.

## A05:2021 — Security Misconfiguration
- ✅ CSP, HSTS, COOP, COEP, Referrer-Policy, Permissions-Policy in
  `public/_headers`.
- ❌ No CSP `report-uri` — plan: ship `csp-report` edge function.
- ⚠ Verify IONOS deploy serves the `_headers` file (or equivalent).

## A06:2021 — Vulnerable and Outdated Components
- ✅ Dependency audit ran (`npm audit fix`) in the 2026-04-16 hardening pass.
- ✅ New CI workflow `security-audit.yml` gates PRs on `npm audit` high+.
- ⚠ Four majors scheduled separately: `@vercel/node 3.x`, `workbox-build 7`,
  `vite 7 + vitest`, `jsdom 29`.

## A07:2021 — Identification and Authentication Failures
- ✅ WebAuthn router (`webauthn-router`, `_shared/webauthn-crypto.ts`).
- ✅ OTP hardening with attempt caps and rate limiting.
- ✅ Rate limiting on auth endpoints (`withRateLimit`).
- ⚠ Not all auth-related functions are rate-limited — to be fixed with the
  routers rollout.

## A08:2021 — Software and Data Integrity Failures
- ✅ GitHub workflow `ionos-deploy-now` uses `actions/checkout@v4` +
  `setup-node@v4`; action is a well-known 3rd-party.
- ⚠ Third-party action `ionos-deploy-now/deploy-to-ionos@v1` should be
  pinned by commit SHA (tracked in `docs/security-audit-2026-04-16.md`).

## A09:2021 — Security Logging and Monitoring Failures
- ✅ Structured edge logger emits `request_started`, `request_completed`,
  `rate_limited`, `request_failed`.
- ✅ Audit tables + export job (`audit-export`).
- ⚠ No alerting on auth-anomaly spikes — track separately.

## A10:2021 — Server-Side Request Forgery
- ⚠ AI proxies (`ai-proxy`, `ai-web-search`) must enforce outbound
  allowlists + deny private-range CIDRs. Grep for `fetch(` inside
  `supabase/functions` and confirm each host is allowlisted.
- ✅ `reject-query-secrets` middleware limits query secret propagation to
  downstream services.
