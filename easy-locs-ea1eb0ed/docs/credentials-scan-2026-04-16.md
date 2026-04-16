# Credentials Scan — 2026-04-16 (Task #732)

## Scope
Full audit of the repository for hardcoded credentials beyond the
`SUPABASE_ACCESS_TOKEN_NEW` (`sbp_…`) admin token already rotated in Task
#723. Coverage:

- `.replit`, `.env*`, `.npmrc`, root config files
- `easy-locs-ea1eb0ed/src/**`, `supabase/**` (migrations + edge functions),
  `lambda-handlers/**`, `orchestrator/**`, `scripts/**`, `e2e/**`, `tests/**`
- `docs/**`, `easy-locs-ea1eb0ed/docs/**`
- `.github/**` workflows
- Git history (`git log -p -G…` on the rotated token + `.replit` history)

## Result: clean bill of health (no new leaked credentials)

The new automated scanner (`scripts/secret-scan.sh`) was run against the full
working tree (5,461 files). Once the prior false-positive in
`supabase/functions/send-push-notification/index.ts:51` was excluded (it is
parsing/unwrapping a PEM marker on an env-loaded FCM service-account key,
not embedding a key), the scan reports zero high-confidence credential
matches.

### Items reviewed and intentionally NOT flagged

| Item | Where | Status |
| --- | --- | --- |
| `VITE_SUPABASE_PUBLISHABLE_KEY` (anon JWT, `eyJ…role:anon`) | `.replit:49`, `easy-locs-ea1eb0ed/.env:1,4` | ✅ Public by design — Supabase anon keys ship to the browser; protected by RLS |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_PROJECT_ID` | `.replit`, `.env` | ✅ Not secrets — public project URL/ID |
| `VITE_SENTRY_DSN` (`https://…@…ingest.sentry.io/…`) | `.replit:51` | ✅ Public by design — Sentry DSNs are intended for client-side reporting |
| `whsec_${crypto.randomUUID()…}` placeholder | `src/components/delivery/DeliveryAPIWebhooks.tsx:74` | ✅ UI-generated mock value for an unsaved webhook row, not a real Stripe webhook secret |
| `Bearer el_your_api_key`, `Bearer admin-token`, `Bearer tok-123` | `src/pages/DeveloperPortal.tsx`, `src/test/kyc-*.test.ts`, `tests/contracts/public-api.contract.test.ts`, `supabase/functions/public-api/index.ts` | ✅ Documentation example / test fixtures / error-message templates — not real tokens |
| `-----BEGIN PRIVATE KEY-----` literal | `supabase/functions/send-push-notification/index.ts:51` | ✅ String marker stripped from an env-loaded FCM key (`Deno.env.get(...)`); the key itself is never in source. The scanner's PEM rule requires base64 body bytes after the marker, so this reference is not flagged without needing a file-level exclusion. |
| Stripe / GitHub / Slack / AWS / Google API key regexes | `.config/replit/.semgrep/semgrep_rules.json` | ✅ Vendored Semgrep rule definitions (out of scope, not source code) |
| `sk-XX` locale codes | `src/lib/global-country-registry.ts`, `src/lib/i18n-canonical.ts`, etc. | ✅ Slovak locale strings — false positive of the OpenAI-key regex (already documented in `security-audit-2026-04-16.md` M-1) |

### Git history note
The previously rotated `sbp_e13f1ae04b0feb5218b77e8a01104972491de26f`
admin token still exists in pre-rotation revisions of `.replit` (commit
`0ccfe68` removed it; older commits retain it). Rotation has already been
performed in Task #723 so the token is invalid, but git-history rewrite
would be required to fully purge it. **Recommendation:** treat the value as
permanently compromised (already done) and move on; rewriting public git
history is generally more disruptive than the residual risk of a revoked
token.

## Automated regression prevention

- Added `scripts/secret-scan.sh`: dependency-free bash scanner that walks
  tracked + untracked-not-ignored files and matches a curated set of
  high-confidence credential patterns (Supabase admin tokens, Stripe live/
  test/restricted keys, Stripe webhook signing secrets, AWS access keys,
  GitHub PATs/OAuth tokens, GitLab PATs, Slack tokens, Google API keys,
  OpenAI / Anthropic / HuggingFace keys, Mapbox secret tokens, PEM private
  keys, DB connection strings with embedded passwords).
- Wired the scanner into `scripts/post-merge.sh` so it runs automatically
  after every merge into the working environment. Findings are surfaced
  loudly in the post-merge log.
- The scanner can also be invoked manually (`bash scripts/secret-scan.sh`)
  before publishing or as part of any future CI workflow.

## Patterns covered by the scanner

```
sbp_<30+>                          Supabase management API tokens
sk_live_/sk_test_/rk_live_<20+>    Stripe live, test, and restricted secret keys
whsec_<32+>                        Stripe webhook signing secrets
AKIA…/ASIA…                        AWS access key IDs
ghp_/gho_/ghu_/ghs_/ghr_<30+>      GitHub OAuth + personal access tokens
github_pat_<60+>                   GitHub fine-grained PATs
glpat-<20>                         GitLab personal access tokens
xox[baprs]-…                       Slack bot/user/app tokens
AIza<35>                           Google API keys
sk-(proj-|ant-)?<40+>              OpenAI / Anthropic API keys
hf_<30+>                           HuggingFace tokens
sk.eyJ….….….                       Mapbox secret tokens (public pk.eyJ ones allowed)
-----BEGIN … PRIVATE KEY-----      Embedded PEM private keys
postgres://, mysql://, redis://, mongodb://  with `user:password@` inline
```

## Conclusion
Beyond the already-rotated `SUPABASE_ACCESS_TOKEN_NEW`, no other live
secrets are committed to the repository. Automated scanning is now in place
to catch regressions on every merge.
