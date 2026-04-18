# 01 — Architecture Diagram

> Step-1 deliverable for Task #1075. Describes the target architecture for the
> next-gen Easy Locs super platform. No implementation lives here.

## High-level layered view

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            CLIENTS                                       │
│  Web (React / Vite)   ·   Mobile shell (Capacitor)   ·   Super Admin UI  │
└──────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                       UNIFIED UX SHELL                                   │
│  Route registry · Navigation · Notification center · Intent router       │
│  (One shell. Same action via URL / button / redirect → same state.)      │
└──────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                       PLATFORM BUS                                       │
│  Single canonical event/command bus. All cross-domain comms go here.     │
│  (No custom EventTargets in domains. No direct domain-to-domain imports.)│
└──────────────────────────────────────────────────────────────────────────┘
        │            │            │            │            │
        ▼            ▼            ▼            ▼            ▼
   ┌────────┐  ┌─────────┐  ┌──────────┐  ┌────────┐  ┌──────────┐
   │Identity│  │ Wallet  │  │ Orbit    │  │Onboard │  │ Verticals│
   │ domain │  │ domain  │  │ (comms)  │  │ engine │  │ (food,   │
   │        │  │         │  │ domain   │  │        │  │ taxi, …) │
   └────────┘  └─────────┘  └──────────┘  └────────┘  └──────────┘
        │            │            │            │            │
        └────────────┴────────────┴────────────┴────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    CANONICAL DATA LAYER                                  │
│  Service layer (typed contracts) → Supabase (RLS) → Postgres             │
│  One schema per entity (user, merchant, order, message, payment, …).     │
└──────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                 OBSERVABILITY + IMPROVEMENT LOOP                         │
│  Playwright runtime engine ─┐                                            │
│  k6 load simulator         ─┼─► Analysis engine ─► Self-improvement loop │
│  Console + network capture ─┘     (severity, RCA,    (approval gate +    │
│                                    classification)    minimal patches)   │
│                                                                          │
│              ▲                                                           │
│              └────────── Super Admin control plane ◄──────────           │
└──────────────────────────────────────────────────────────────────────────┘
```

## Subsystem responsibilities

### Unified UX shell
- Owns the global route registry, navigation, and notification entry points.
- Hosts the intent router that adapts menus/CTAs based on real usage signals
  (Phase 9), without changing layouts.
- Forbidden from holding business logic — purely composition + dispatch.

### Platform bus
- Single canonical event/command bus.
- All cross-domain communication MUST flow through it.
- Replaces every ad-hoc `EventTarget`, custom emitter, or direct domain import.
- Provides typed channels for: `identity.*`, `wallet.*`, `orbit.*`,
  `onboarding.*`, `vertical.*`, `runtime.*`, `admin.*`.

### Identity domain
- Single canonical `user_profile` (Phase 1). No duplicate users across modules.
- Owns: auth session, profile reads/writes, role evaluation, identity merge
  for legacy duplicates (read-time + write-time reconciliation in Phase 3).

### Wallet domain
- One global wallet per user, multi-currency-ready.
- Owns: balance, transactions, history, holds, refunds.
- The only writer to `wallet_*` tables. Every other domain calls the wallet
  service; nothing writes ledger rows directly.

### Orbit (communications) domain
- Unified channel for user ↔ merchant ↔ rider ↔ support.
- All realtime channels go through the canonical wrapper (Phase 8). The
  wrapper maps `.unsubscribe()` → `removeChannel` internally.
- Cache reset hooks fire on signOut, token expiry, user switch, cross-tab logout.

### Onboarding engine
- Single entry: email / phone / website / business name.
- Pipeline: ingest → enrich (scrape, parse menus/services, photos, hours,
  geo) → provision (merchant + wallet + Orbit channel + dashboard workspace)
  transactionally.
- Real data preferred over placeholders.

### Verticals (food / taxi / services / …)
- Plug into the canonical contracts. They never invent their own user, wallet,
  or comms layer.
- Each vertical exposes: catalog, order lifecycle, vertical-specific UI hooks.

### Observability + improvement loop
- **Playwright runtime engine** (Phase 4) — runs as a runtime engine, not just
  CI, with 8 user profiles and imperfect-user behaviors.
- **k6 load simulator** (Phase 5) — 100 → 300 → 1000 mixed-profile ramp.
- **Analysis engine** (Phase 6) — classifies every issue with severity,
  route/module, profile, repro, logs, RCA, minimal fix, recurrence risk.
- **Self-improvement loop** (Phase 7) — onboard → simulate → detect → classify
  → propose → **approval gate** → apply minimal fix → retest. Resumable,
  idempotent, never auto-applies critical fixes.
- **Super Admin control plane** (Phase 10) — operator surface for everything
  above.

### Digital twin (Phase 11)
- Production-mirror environment for thousands of simulated users + load spikes.
- Issues caught here MUST surface before reaching production.

## Data + control flow (happy paths)

### Onboarding (Phase 2)
```
Operator/User input ─► Onboarding engine ─► Ingest pipeline ─► Provisioner
                                                                   │
                                ┌──────────────────────────────────┤
                                ▼                ▼                 ▼
                         Identity(create)   Wallet(create)   Orbit(create)
                                │                │                 │
                                └────────────────┴─────────────────┘
                                                 │
                                                 ▼
                                       Dashboard workspace ready
                                       (≤ 2 minutes end-to-end)
```

### Runtime improvement loop (Phase 7)
```
Playwright + k6 ─► Analysis engine ─► Classified issue
                                          │
                                          ▼
                                 Proposed minimal fix
                                          │
                                          ▼
                                ┌─────── Approval gate ───────┐
                                │                             │
                              reject                        approve
                                │                             │
                                ▼                             ▼
                        Drop / retain as            Apply minimal fix
                        known issue                         │
                                                            ▼
                                                  Retest (Playwright + k6)
                                                            │
                                                            ▼
                                                  Regression guard added
                                                  (Phase 12: invariant /
                                                   wrapper / guard / test)
```

## Hard architectural rules (binding)

1. **No direct DB access from UI.** Components call services; services call DB.
2. **No parallel identity / wallet / comms systems.** One canonical of each.
3. **All realtime through the canonical wrapper.** No raw Supabase channel
   subscriptions in domains.
4. **Cache resets are mandatory** on signOut, token expiry, user switch, and
   cross-tab logout.
5. **No auto-applied critical fixes.** Approval gate is non-bypassable.
6. **Every fix ships with a regression guard.** No exceptions.
7. **Sandbox-only payments** during load tests. No destructive real actions.

## Out of scope (re-stated for clarity)

- UI redesigns, speculative new verticals, replacing auth/wallet/messaging
  providers, mobile-native runtime simulation, public analytics, real (non-
  sandbox) payment traffic during load tests.
