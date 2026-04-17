# 07 — Polling vs Realtime / Cache

Source: `99-evidence/polling-callsites.txt`,
`99-evidence/realtime-callsites.txt`. Numbers below are from the `wc -l`
of each file.

## Headline numbers

| Pattern                         | Callsites |
|---------------------------------|----------:|
| `setInterval(`                  | 176 |
| `refetchInterval` (React Query) |  40 |
| Other (`refetchOnWindowFocus`, `staleTime`, `cacheTime`) | balance to 374 |
| Realtime channel subscriptions  |  74 |

374 polling-style callsites for 74 realtime subscriptions = ~5× the
realtime surface running on timers.

## Top hot pollers (priority order)

Severity legend:
- **C1** — sub-5s polling against the DB or an edge function ⇒ direct cost.
- **C2** — sub-60s polling that could be realtime or cache.
- **C3** — UI-only timers (countdowns, animation pulses) — not a cost.

| File:line | Interval | Target | Class | Action |
|-----------|---------:|--------|-------|--------|
| `src/components/chat/ChatPaymentCards.tsx:297` | 3000 ms | `payment_request.status` | **C1** | Replace by realtime subscription on `payment_intents` (table exists). |
| `src/components/admin/AgentCommandConsole.tsx:235` | 4000 ms | agent state | **C1** | Replace by `omega_decisions` realtime channel (already subscribed in `useServerEvents.ts`). |
| `src/components/admin/ExecutionTaskPanel.tsx:526` | 5000 ms | `execution_tasks` | **C1** | Replace by realtime on `execution_tasks` (3 UPDATE writers). |
| `src/components/admin/control/agents/AgentsCockpit.tsx:109` | 30 000 ms | agent metrics | C2 | Acceptable; keep with `staleTime`. |
| `src/components/admin/control/agents/useAgentMetrics.ts:56` | 60 000 ms | agent metrics | C2 | Acceptable; keep. |
| `src/components/marketplace/LiveCommerceToggle.tsx:41` | 30 000 ms | live-commerce flag | C2 | Could be realtime if a `live_commerce_state` row flips. |
| `src/components/delivery/RealTimeDataHub.tsx:55` | 3 000 ms | UI pulse | C3 | Local pulse — fine. |
| `src/components/merchant/OrderNotificationAlert.tsx:50` | 2 000 ms | tone replay | C3 | Local — fine. |
| `src/components/auth/PhoneOTPFlow.tsx:66` | 1 000 ms | countdown | C3 | Fine. |
| `src/components/call/IncomingCallDialog.tsx:34` | 1 000 ms | ring time | C3 | Fine. |
| `src/components/call/CallProvider.tsx:95` | 1 000 ms | call-duration tick | C3 | Fine. |
| `src/components/communication-hub/QRContactCard.tsx:251,270` | per scan | QR scan loop | C3 | Inherent. |
| `src/components/landing/LiveActivityBar.tsx:26` | unspecified | rotating banner | C3 | Fine. |
| `src/components/communication-hub/OrbitStatusSection.tsx:278` | unspecified | orbit status | C2 | Could move to channel-presence event. |
| `src/components/dashboard/C2CSmartBanner.tsx:233` | unspecified | banner refresh | C2 | Acceptable as cache. |
| `src/components/discovery/VerticalHubPage.tsx:260` | unspecified | hub feed | C2 | Move to React Query with `staleTime`. |

(Full list in `99-evidence/polling-callsites.txt` — 176 setInterval +
40 refetchInterval lines.)

## Polling that should already be realtime (concrete proof)

There are 74 `supabase.channel(...).on("postgres_changes", …)` callsites
already, including:
- `useConversationThreads.ts` listens on `commerce.bookings`,
  `commerce.transactions`, `orbit.conversations_v2`, `orbit.call_logs`.
- `BuyerDeliveryDashboard.tsx`, `CustomerTrackingPage.tsx`,
  `FleetManagementDashboard.tsx` listen on `mobility_jobs`,
  `rider_presence`.
- `OrdersManager.tsx`, `BuyerOrderTracker.tsx` listen on
  `storefront_orders`.

**Conflict:** `useServerEvents.ts` both fetches `fetchRecentServerEvents`
on mount AND subscribes to realtime — a single missed event triggers a
full refetch. This is correct as a hydration step but is also paired
elsewhere with a 60-s `setInterval` refetch in admin dashboards. That
combined behaviour double-pays for the same data.

## Coarse cost estimate

Assumptions: 1 000 concurrent active sessions, average user keeps two
admin/cockpit dashboards open for 10 % of session.

| Source | Calls/min/session | Sessions exposed | Calls/min |
|--------|------------------:|-----------------:|----------:|
| `ChatPaymentCards` 3 s | 20 | 5 % (paying flow) = 50 | **1 000** |
| `AgentCommandConsole` 4 s | 15 | 1 % (admin) = 10 | 150 |
| `ExecutionTaskPanel` 5 s | 12 | 1 % = 10 | 120 |
| Sum on these three only | | | ~1 270 calls/min ≈ **76 K calls/h** |

That is the cost on three pollers alone. Removing them in favour of the
existing realtime channel would drop ~75 K Supabase invocations per
hour without functional regression.

## Cache opportunities

`refetchInterval` callsites without a `staleTime` rely on time-based
revalidation. Adding `staleTime: 60_000` to the same queries would cut
duplicate calls when the user toggles tabs.

Caches not currently used:
- No `localStorage` / `IndexedDB` cache for static reference data
  (currencies, country list, vertical metadata) detected. Phase 2 should
  add a long-lived cache.
- React Query default `staleTime` is 0 ms in many places — add a global
  `defaultOptions.queries.staleTime: 30_000`.

## Recommendation summary

1. Phase 1: convert the three **C1** pollers to existing realtime channels.
2. Phase 1: add a global React Query `staleTime` and audit the 40
   `refetchInterval` lines for downgrade to event-driven.
3. Phase 2: pair every `setInterval` with a server-side `last_event_ts`
   guard — UI fetches only on tick **and** server says "newer".
