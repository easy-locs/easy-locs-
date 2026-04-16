# Secrets — Rotation SOP

## Storage rules

1. **No secret in git**. The only acceptable places are:
   - Replit Secrets (for local / CI agent runs)
   - Supabase project secrets (for edge functions)
   - IONOS deployment environment (for SSR / static deploy configuration)
2. `.replit` / `.env*` must never contain `sbp_*`, `sk_live_*`, `sk_test_*`,
   `whsec_*`, `AKIA*`, GitHub PATs, or raw private keys.
3. CI gate: `.github/workflows/secret-scan.yml` blocks PRs matching any of
   the 15+ credential patterns in `scripts/secret-scan.sh`.

## Rotation schedule

| Secret | Cadence | Trigger |
| --- | --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | 90 days | Scheduled + any contractor offboarding |
| `SUPABASE_ACCESS_TOKEN_NEW` (management API) | 90 days | Scheduled |
| `STRIPE_SECRET_KEY` | 180 days | Scheduled + any incident |
| `STRIPE_WEBHOOK_SECRET` | On endpoint change | Change |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | 90 days | Scheduled |
| `MAPBOX_ACCESS_TOKEN` (secret, not public URL) | 180 days | Scheduled |
| AWS IAM keys (SES / SQS / S3) | 90 days | Scheduled |
| `SENTRY_AUTH_TOKEN` | 180 days | Scheduled |
| GitHub App / Inngest / Plaid signing keys | Per provider cadence | Provider-driven |
| JWT signing key (Supabase) | 365 days OR on suspected leak | Incident |

## Rotation procedure (generic)

1. Generate new value in the provider dashboard.
2. Add it as a new secret name (e.g. `FOO_KEY_NEXT`) in the relevant
   environments (Supabase, Replit, IONOS).
3. Deploy code that accepts either `FOO_KEY` or `FOO_KEY_NEXT`.
4. Once traffic is served on new value, swap `FOO_KEY` to point at the new
   value; remove `FOO_KEY_NEXT`.
5. Revoke the old value at the provider.
6. Commit a rotation entry to `docs/security/rotation-log.md` (one line:
   date, key, reason) — never the value.

## Incident rotation (suspected leak)

- Treat `sbp_*` and service-role keys as **compromised** if they ever appear
  in git, logs, tickets, or screenshots.
- Revoke **before** replace; downtime is preferable to a compromised
  service-role key.
- Run `bash scripts/secret-scan.sh` locally and in CI to confirm no residual
  exposure.
- Post-mortem into `docs/security/` within 48 hours.

## Scheduled CI run

Add to the weekly cron on `.github/workflows/security-audit.yml` (already
ships in this task): a full-repo secret scan so that a force-push bypassing
PR checks still triggers an alert within 7 days.
