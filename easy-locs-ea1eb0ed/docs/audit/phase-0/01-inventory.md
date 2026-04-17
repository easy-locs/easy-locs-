# 01 — Inventory

Reconstructed from the codebase via the Phase 0 inventory scripts. Sources for
every count are the corresponding evidence files under `99-evidence/`.

## 1. Frontend application

Vite + React 19 + TypeScript SPA rooted in `src/App.tsx`.

| Asset                         | Count | Evidence |
|-------------------------------|------:|----------|
| Files (`.ts`/`.tsx`) under `src/` | 4 119 | `find src -type f` |
| Page files under `src/pages/`     |   500 | `99-evidence/page-files.txt` |
| Hooks under `src/hooks/`          |   207 | `ls src/hooks` |
| Lazy import callsites             |   182 | `99-evidence/lazy-imports.txt` |
| `<Route path=…>` declarations     |   547 | `99-evidence/routes-declared.txt` |
| Distinct route paths              |   538 | `routes-declared.txt` (de-duplicated) |
| Top-level component subdirs in `src/components/` | 91 | `find src/components -maxdepth 1 -type d` |

Pillar route registries live under `src/routes/`:
`admin.routes.tsx`, `auth.routes.tsx`, `dashboard.routes.tsx`,
`deeplinks.routes.tsx`, `driver.routes.tsx`, `legal.routes.tsx`,
`me.routes.tsx`, `merchant.routes.tsx`, `onboarding.routes.tsx`,
`orbit.routes.tsx`, `pro.routes.tsx`, `radar.routes.tsx`, `seo.routes.tsx`,
`wallet.routes.tsx`, `index.tsx`.

DDD scaffolding:
- `src/domains/` (admin, dashboard, i18n, me, real-estate, seo, call,
  delivery, orbit, rental, services, cards, explore, loyalty, property,
  restaurant, content-pipeline, flight, map, qr, revenue, creator, hotel,
  marketplace, radar, ride, shared, wallet) — 28 domains.
- `src/families/` (auth, dashboard, identity, media, orbit-i18n, stories,
  bridges, device, import, messages, presence, tabs, broadcast, ephemeral,
  location, notifications, radar, time, calls, groups, marketplace,
  orbit-dispatch, send, wallet) — 24 families.
- `src/repositories/` — single-domain repos hand-rolled per area.
- `src/integrations/supabase/client.ts` — single canonical Supabase client.

## 2. Edge functions (Supabase)

| Asset                                  | Count |
|----------------------------------------|------:|
| Edge function dirs with `index.ts`     |   239 |
| Shared files (`_contracts.ts`, `_manifest.ts`, `_shared/`) | 3 |
| Total entries in `supabase/functions/` |   242 |
| Edge functions never invoked by `functions.invoke(...)` from `src/` | 137 |
| Edge functions invoked at least once   |   102 |

Source: `99-evidence/edge-functions.csv`,
`99-evidence/edge-function-invoker-counts.txt`,
`99-evidence/edge-function-frontend-invokers.txt`.

Top frontend-invoked edge functions:

```
17 send-email
11 presence-heartbeat
10 dispatch-delivery
 7 s3-upload-proxy
 7 redis-proxy
 6 plaid-link-token
 6 gateway-marketplace-sync
 4 translate-message
 4 system-router
 4 send-otp
 4 rent-payment
 4 refund-admin
 4 livekit-room-token
 4 get-turn-credentials
 4 esign-create-envelope
 4 dispatch-ride
 4 create-concierge-payment
 4 create-booking-payment
 4 ai-assistant
```

Router-style functions (likely fan-out hubs): `admin-router`, `ai-router`,
`booking-router`, `commerce-router`, `stripe-router`, `system-router`,
`voice-router`, `wallet-router`, `webauthn-router`.

## 3. Lambda handlers (AWS)

`lambda-handlers/` ships **4** Node lambdas:

- `lambda-handlers/ai-tasks/index.ts` — AI worker
- `lambda-handlers/analytics/index.ts` — analytics aggregator
- `lambda-handlers/media-processing/index.ts` — media transcode/transform
- `lambda-handlers/scraping/index.ts` — scraping worker

Provisioned alarms (`infra/cloudwatch-alarms.ts`) reference 4 lambda
function names and 3 SQS queues:
`easy-locs-ai-tasks`, `easy-locs-media-processing`, `easy-locs-scraping`.

## 4. Database schema (reconstructed from migrations)

| Asset                                   | Count |
|-----------------------------------------|------:|
| SQL migration files                     |   702 |
| Distinct tables seen in `CREATE TABLE`  |   791 |
| RLS `CREATE POLICY` statements          | 2 234 |
| `CREATE FUNCTION`/RPC statements        |   434 (288 unique names) |
| `CREATE TRIGGER` statements             |   241 |
| `CREATE INDEX` statements               | 1 046 |

Sources: `99-evidence/tables-created.txt`, `rls-policies.txt`,
`rpc-functions-provenance.txt`, `rpc-names.txt`, `triggers.txt`, `indexes.txt`.

Storage buckets observed in migrations include `rental-docs`
(`supabase/migrations/20260226030620_*.sql`) plus additional buckets in
`20260226221000_*.sql`. Storage RLS is in the same files
(`storage.objects FOR INSERT/SELECT/DELETE`).

## 5. Realtime / channels

Total Supabase realtime subscriptions in the frontend: **74** callsites
(`99-evidence/realtime-callsites.txt`).

Notable hubs:
- `src/hooks/useServerEvents.ts` — `server_events`, `omega_decisions`.
- `src/domains/orbit/realtime/` — Orbit live channels.

## 6. Polling / background

| Pattern                                    | Count | File |
|--------------------------------------------|------:|------|
| `setInterval(`                             |   176 | `polling-callsites.txt` |
| `refetchInterval` in React Query           |    40 | `polling-callsites.txt` |
| Other (`refetchOnWindowFocus`, `staleTime`) | balance to 374 | `polling-callsites.txt` |

## 7. Writers (mutation surface)

| Surface                        | Mutation callsites |
|--------------------------------|-------------------:|
| Frontend (`src/`)              |  55 |
| Edge functions (`supabase/functions/`) | 521 |
| Combined                       | 575 (one global dump in `mutations-callsites.txt`) |

Top-written tables (combined):

```
86 seed_merchants UPDATE
33 notifications  INSERT
33 audit_logs     INSERT
15 engine_run_logs INSERT
11 chat_messages_v2 INSERT
10 rent_calls     UPDATE
10 command_audit_log INSERT
 9 mobility_jobs  UPDATE
 8 system_health_snapshots INSERT
 8 payment_provider_events INSERT
 8 engine_supervisor UPDATE
 8 approval_requests UPDATE
 7 job_queue      UPDATE
 6 subscriptions  UPDATE
 6 payment_events INSERT
 6 bookings       UPDATE
```

(Full ranking in `99-evidence/writer-aggregation.txt`.)

## 8. Third-party integrations referenced

Detected from edge function names + repo contents:
- **Stripe** — `stripe-router`, `stripe-webhook`, `stripe-connect-login`,
  `capture-payment-intent`, plus payment-* edge fns.
- **Plaid** — `plaid-link-token`.
- **Mobile Money / Crypto** — referenced via payment routers.
- **WebAuthn** — 8 `webauthn-*` functions.
- **AI / RAG** — `ai-assistant`, `ai-rag`, `ai-router`, `ai-proxy`,
  `ai-recommendations`, `ai-shopping-chat`, `ai-eval-runner`,
  `ai-content-enrichment`, `ai-entity-enrichment`, `ai-web-search`,
  `vector-embed`, `vector-similarity-search`.
- **Voice / TTS / STT** — `voice-router`, `voice-stt-token`, `voice-tts`,
  `voice-processing`, `tts-engine`.
- **LiveKit** — `livekit-room-token`, `get-turn-credentials`.
- **Search** — `sync-meilisearch`, `sync-meilisearch-cron`.
- **Email / OTP / SMS** — `send-email`, `send-otp`, `verify-otp`.
- **Calendar** — `sync-ical`.
- **GitHub** — `command-github-webhook`, `trigger-github`.
- **AWS** — `aws-health-check`, `s3-upload-proxy`, `sqs-enqueue-proxy`,
  CloudWatch alarms in `infra/cloudwatch-alarms.ts`.
- **eSign** — `esign-create-envelope`.

## 9. Apps / shells

The repo currently ships a **single** SPA (`src/App.tsx`). Capacitor is
configured (`capacitor.config.ts`) for iOS/Android shells over the same
SPA. No separate web/admin app exists — admin lives at `/admin/*` routes
inside the same bundle.

## 10. Jobs / cron

Cron-style edge functions (by name):
`auto-onboarding-cron`, `autonomous-cron-dispatcher`,
`cleanup-expired-media`, `cleanup-expired-messages`,
`cleanup-integration-health-logs`, `cleanup-orphan-media`,
`collect-sepa-rents`, `command-monitoring-cron`, `sync-meilisearch-cron`,
`watchdog-ping`, `auto-source-scrape`, `uae-data-cleanup`,
`uae-scrape-onboard`.
