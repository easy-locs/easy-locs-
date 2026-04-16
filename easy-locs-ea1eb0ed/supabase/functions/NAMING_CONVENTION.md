# Edge Function Naming Convention

## Rule
All edge functions MUST be prefixed with the owning domain or integration layer.

```
<domain>-<action>[-<noun>]
```

## Consolidated Architecture

All edge functions are now accessible through **domain routers** — consolidated
multi-route handlers that serve as the single entry point per domain. Each router
provides built-in JWT verification, tier-aware rate limiting, CORS handling, and
structured logging.

### Deployment Architecture

Only **35 functions** are deployed as public endpoints (22 routers + 11 webhooks + 2 crons).
All other ~180 functions are internal-only — they contain business logic accessed exclusively
via router proxy. Direct public access to internal functions is blocked by `requireRouterOrigin`.

Deploy with: `supabase/deploy-functions.sh`
Configure in: `supabase/config.toml`

### Client-Facing Entry Points (22 total)

| Router | Domain | Route Count | Auth | Rate Limit |
|---|---|---|---|---|
| `admin-router` | Back-office admin, refunds, commands | 17 | JWT | Tier-aware |
| `ai-router` | AI / ML services | 12 | JWT | Tier-aware + Arcjet |
| `ai-proxy` | Storefront AI features (dedicated) | 4 actions | JWT | Tier-aware |
| `booking-router` | Marketplace bookings | 11 | JWT | Tier-aware |
| `commerce-router` | Commerce, orders, e-sign | 12 | JWT | Tier-aware |
| `food-router` | Food & restaurant vertical | 11 | JWT | Tier-aware |
| `gdpr-router` | Privacy compliance | 3 | JWT | Tier-aware |
| `identity-router` | Auth, profiles, OTP | 8 | JWT (some public) | Tier-aware |
| `infra-router` | Health, cron, workers, DLQ | 37 | JWT (health public) | Tier-aware |
| `logistics-router` | Delivery, rides, dispatch | 4 | JWT | Tier-aware |
| `marketplace-router` | Listings, search, categories | 10 | JWT (browse public) | Tier-aware |
| `media-router` | Media processing, uploads, scraping | 18 | JWT | Tier-aware + Arcjet |
| `notification-router` | Email, push, SMS, alerts | 14 | JWT | Tier-aware |
| `orbit-router` | Social & messaging | 7 | JWT | Tier-aware |
| `public-api` | External developer API | varies | API key | IP-based |
| `rent-router` | Property / rent lifecycle | 9 | JWT | Tier-aware |
| `search-router` | Search, embeddings, spatial | 7 | JWT (search public) | Tier-aware |
| `stripe-router` | Stripe integration & checkout | 17 | JWT (webhooks exempt) | Tier-aware |
| `system-router` | Health, analytics, metrics | 10 | JWT + admin | Tier-aware |
| `voice-router` | Voice, video, WebRTC, Plaid | 10 | JWT | Tier-aware + Arcjet |
| `wallet-router` | Wallet, payments, crypto | 19 | JWT (webhooks exempt) | Tier-aware |
| `webauthn-router` | Passwordless auth | 8 | Public | Rate-limited |

### Approved Domain Prefixes

| Prefix | Domain | Router |
|---|---|---|
| `wallet-` | Wallet & payments | `wallet-router` |
| `orbit-` | Social & identity | `orbit-router` |
| `rent-` | Property / rent lifecycle | `rent-router` |
| `booking-` | Marketplace bookings | `booking-router` |
| `food-` | Food & restaurant vertical | `food-router` |
| `admin-` | Back-office admin | `admin-router` |
| `ai-` | AI / ML services | `ai-router` |
| `send-` | Notification dispatch | `notification-router` |
| `stripe-` | Stripe integration | `stripe-router` |
| `deliveroo-` | Deliveroo integration | `food-router` |
| `refund-` | Refund flows | `admin-router` |
| `gdpr-` | Privacy compliance | `gdpr-router` |
| `webauthn-` | Passwordless auth | `webauthn-router` |
| `search-` | Search & discovery | `search-router` |
| `voice-` | Voice & media | `voice-router` |
| `command-` | Command center | `admin-router` |

## Internal Functions (behind routers)

Internal functions are accessed only through their parent router via internal
HTTP proxy. They MUST NOT be called directly by frontend clients.

### ai-router internals
```
ai-assistant              ai-entity-enrichment      ai-shopping-chat
ai-web-search             classify-business         extract-article
generate-cv               generate-seo              ops-ai-chat
storefront-description    translate-message
```

### admin-router internals
```
admin-payout-approve      admin-payout-reject       admin-trigger
audit-export              auto-onboarding-cron      command-approval-webhook
command-center-api        command-email-intake       command-github-webhook
command-monitoring-cron   kyc-review                ops-ai-chat
process-refund            refund-admin              refund-process-booking
refund-request-booking    seller-kpi-snapshot
```

### booking-router internals
```
booking-approve           booking-complete          booking-create
booking-lifecycle         booking-reject            create-booking-payment
create-concierge-payment  export-ical               notify-booking
submit-review             sync-ical
```

### commerce-router internals
```
esign-create-envelope     esign-webhook             order-manage
shop-import-processor     social-preview            uae-scrape-onboard
```

### food-router internals
```
auto-source-scrape        deep-scrape-build         deliveroo-dubai-food
food-audit                food-menu-builder         food-normalizer
food-publish              food-rescrape-monitor     food-visibility-gate
food-visual-clean         run-ingestion-pipeline
```

### gdpr-router internals
```
gdpr-delete-account       gdpr-deletion-processor   gdpr-export
```

### identity-router internals
```
generate-cv               guest-session             reveal-contact
```

### infra-router internals
```
autonomous-cron-dispatcher  aws-health-check        backup-storage
browser-user-repair-engine  cache-manager           cleanup-expired-messages
cleanup-integration-health-logs  dispatch-cron      dld-analytics
dld-sync-cron             dlq-ingest                dlq-processor
engine-cron-server        expire-listings           expire-pending-referrals
health-check              inngest-handler           integration-health-cron
integration-health-monitor  job-queue-worker        job-runner
master-runtime-qa-engine  omega-server-loop         pipeline-worker
platform-recovery         prayer-push-cron          prayer-times
public-health             redis-enqueue             redis-proxy
repair-worker             run-engine-cron           run-scheduled-audit
runtime-control-plane     sentinel-server           sentinel-server-guards
uae-data-cleanup          watchdog-ping
```

### logistics-router internals
```
dispatch-delivery         dispatch-ride             dispatch-webhook
order-manage
```

### marketplace-router internals
```
expire-listings           shop-import-processor     uae-scrape-onboard
```

### media-router internals
```
auto-source-scrape        cleanup-expired-media     cleanup-orphan-media
deep-scrape-build         export-ical               fx-rates
generate-pdf              lambda-invoke-proxy       media-processor
process-onboarding-media  rss-proxy                 s3-upload-proxy
scrape-proxy              sqs-enqueue-proxy         sync-ical
tts-engine                video-processor           voice-processing
```

### notification-router internals
```
alert-dispatcher          email-enqueue             email-queue-process
notification-dispatcher   payment-notification      receive-email
send-call-push            send-email                send-notification-email
send-otp                  send-push                 send-push-notification
send-sms                  ses-webhook
```

### orbit-router internals
```
orbit-payment             translate-message
```

### rent-router internals
```
collect-sepa-rents        create-legal-notice-payment  generate-rent-receipt
lease-workflow            rent-create-payment       rent-lifecycle-cron
rent-payment              rent-reminders            tenant-signup
```

### search-router internals
```
generate-embeddings       search-global             search-meilisearch
spatial-query             sync-meilisearch          sync-meilisearch-cron
vector-embed
```

### stripe-router internals
```
capture-payment-intent    check-connect-status      create-checkout
create-checkout-session   create-connect-account    create-guest-checkout
create-listing-checkout   create-storefront-checkout  create-stripe-intent
create-subscription       customer-portal           disconnect-stripe
manage-subscription       stripe-connect-login      stripe-webhook
subscription-portal       verify-guest-payment
```

### voice-router internals
```
get-turn-credentials      livekit-room-token        mux-upload
plaid-link-token          plaid-webhook             presence-heartbeat
voice-processing          voice-stt-token           voice-tts
tts-engine
```

### wallet-router internals
```
award-loyalty-points      check-subscription        commission-split
create-wallet-topup       crypto-payment            crypto-webhook
mobile-money-payment      mobile-money-webhook      orbit-payment
payout-request-create     process-referral-reward   purchase-locs
qr-payment-session        wallet-ops                wallet-pin
wallet-transfer
```

### webauthn-router internals
```
webauthn-authentication-challenge   webauthn-authentication-verify
webauthn-begin-registration         webauthn-finish-registration
webauthn-login-challenge            webauthn-login-verify
webauthn-registration-challenge     webauthn-registration-verify
```

## Shared Utilities (_shared/)

All routers import from the `_shared/` directory:
- `edge-function-consolidation.ts` — EdgeRouter class with JWT + rate limiting
- `domain-router.ts` — createDomainRouter with auth, rate limiting, metrics
- `edge-auth.ts` — JWT verification (requireAuthenticatedUser, requireServiceRole)
- `server-rate-limiter.ts` — Tier-aware rate limiting (free/premium/enterprise)
- `with-rate-limit.ts` — Rate limit middleware wrapper
- `cors.ts` — Origin-validated CORS headers
- `arcjet-protection.ts` — Bot detection and WAF
- `reject-query-secrets.ts` — Prevents secrets in URL params
- `structured-logger.ts` — Structured logging for all functions
- `cache-headers.ts` — Cache control headers
- `edge-cache.ts` — Edge-level response caching

## Auth Exception Policy

Routes may only skip JWT verification (`skipAuth`) for these categories:

| Category | Examples | Justification |
|---|---|---|
| Monitoring health checks | `infra-router /health`, `/public-health` | Uptime probes need unauthenticated access |
| External webhooks | `stripe-router /webhook`, `ses-webhook`, `plaid/webhook`, `crypto/webhook`, `mobile-money/webhook`, `dispatch/webhook`, `esign/webhook`, `inngest`, `command/approval-webhook`, `command/email-intake`, `command/github-webhook` | Webhook providers verify via their own signatures |
| Pre-authentication flows | `identity-router /send-otp`, `/verify-otp`, `/guest-session`, `rent-router /tenant-signup`, `stripe-router /create-guest-checkout`, `/verify-guest-payment` | User has no JWT yet |
| Public read APIs | `search-router /global`, `/meilisearch`, `/spatial`, `infra-router /prayer-times`, `commerce-router /social-preview` | Public data or crawler access |

All other routes MUST require JWT verification. Webhooks must implement their own
signature verification in the downstream function.

## Internal Function Access Guard

Internal (downstream) functions that are proxied by domain routers MUST use the
`requireRouterOrigin(req)` guard from `_shared/edge-function-consolidation.ts`
at their entry point. This prevents direct public access — only requests from
routers (with `X-Router-Origin` header) or service-role callers are allowed.

**Exceptions** (no router-origin guard): standalone external webhook endpoints
(`stripe-webhook`, `ses-webhook`, `plaid-webhook`, `crypto-webhook`,
`mobile-money-webhook`, `esign-webhook`, `dispatch-webhook`,
`command-approval-webhook`, `command-email-intake`, `command-github-webhook`,
`inngest-handler`) and cron dispatchers (`autonomous-cron-dispatcher`,
`prayer-push-cron`). These are called directly by external services or pg_cron
and implement their own authentication (webhook signature verification or
service-role key).

```typescript
import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";

Deno.serve(async (req) => {
  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  // ... function logic
});
```

The `EDGE_ROUTER_SECRET` environment variable is **required** — the guard
throws an error if it is not set. Set it to a strong random value in every
environment (local, staging, production).

## Enforcement

- **New functions**: MUST be added as routes in the appropriate domain router.
  Standalone functions are only permitted for external webhook endpoints that
  cannot change their URL.
- **All routes**: MUST have JWT verification and rate limiting unless explicitly
  listed in the Auth Exception Policy above.
- **Internal functions**: MUST use `requireRouterOrigin(req)` guard to reject
  direct access from clients.
- **Rate limits**: Are tier-aware — free, premium, and enterprise users get
  different limits via `subscription_tier` from profiles. Both `EdgeRouter` and
  `createDomainRouter` resolve the user's tier from `profiles.subscription_tier`
  and apply differentiated limits.
- **CI check**: Run `scripts/check-domain-boundaries.sh` to verify all internal
  functions have the router-origin guard and no new domain boundary violations
  are introduced. This script checks both edge function guards and UI-layer
  import rules.
- **Migration steps**: Add route to domain router → add `requireRouterOrigin`
  guard to internal function → update frontend callers to use router path →
  update this document.
