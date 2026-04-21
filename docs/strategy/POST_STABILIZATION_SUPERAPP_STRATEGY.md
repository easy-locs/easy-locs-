# Post-Stabilisation Super App Strategy — Easy Locs

> **Document type:** Strategy · Research · Planning  
> **Status:** DRAFT — pending stabilisation gate clearance  
> **Date:** 2026-04-21  
> **Audience:** Engineering leads, Product, CTO  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Three-Plan Comparison](#2-three-plan-comparison)
3. [Detailed Classification per Plan](#3-detailed-classification-per-plan)
4. [Recommended Execution Order](#4-recommended-execution-order)
5. [Strict Entry Gates Before Any Implementation](#5-strict-entry-gates-before-any-implementation)
6. [MVP — Dubai Hub (First Pilot City)](#6-mvp--dubai-hub-first-pilot-city)
7. [Explicit Out-of-Scope Items](#7-explicit-out-of-scope-items)
8. [Final Verdict](#8-final-verdict)

---

## 1. Executive Summary

Easy Locs has the architectural foundation (Orbit E2EE, Radar, Marketplace, Supabase edge functions, AI router) to evolve into a next-generation super app. Three strategic paths have been evaluated against global Big Tech compliance constraints, regulatory exposure, and realistic delivery capacity. This document compares those three paths, defines the recommended phased execution order, and establishes the non-negotiable stabilisation gates that must be cleared before any post-stabilisation feature work begins.

**One plan will be retained for pilot execution.** The selection criterion is strict conformance with Big Tech platform rules, regulatory frameworks (RGPD/CCPA/PCI-DSS), and the existing architectural constraints of the Easy Locs codebase.

---

## 2. Three-Plan Comparison

| Dimension | Plan A — Open Marketplace Protocol | Plan B — Vertical AI Hub | Plan C — Invisible Super App |
|---|---|---|---|
| **Core concept** | Open SDK/protocol that any hotel, restaurant, or taxi service installs to auto-generate a standardised mini-app inside Easy Locs | Regional AI-powered hubs (Dubai, Monaco, Singapore…) acting as standalone super apps, interconnected progressively | Easy Locs embeds as a service layer inside Big Tech assistants (Siri, Gemini, Copilot) and Maps — invisible to users as a separate app |
| **Business value** | ★★★★★ — network effect, massive TAM, disruptive commission model (1–2 % vs 30 %) | ★★★★☆ — premium B2B revenue, strong unit economics per city, Audi/luxury positioning | ★★★☆☆ — distribution leverage but brand invisibility, fully dependent on Big Tech favour |
| **Technical feasibility** | ★★☆☆☆ — requires crawler AI, schema.org ingestion pipeline, sandboxed WebView runtime, partner SDK | ★★★★☆ — builds directly on existing Orbit/Radar/Marketplace modules; scoped per city | ★★★★★ — App Intents (iOS 17+), Gemini Extensions, Android widgets — all available APIs |
| **Regulatory risk** | HIGH — RGPD data ingestion from third-party sites, PCI-DSS payment splits, DMA compliance | MEDIUM — regional data residency is manageable; no cross-border data flows in pilot | LOW — Easy Locs stores minimal data; identity layer delegated to Apple/Google |
| **Time to market** | 18–36 months to global reach | 6–12 months for first city pilot | 3–9 months for first integration (Siri Shortcuts / Gemini) |
| **Dependency risk** | HIGH — partner SDK adoption, AI crawler accuracy, anti-scraping mitigations | LOW–MEDIUM — depends on Supabase stability and local partner agreements | VERY HIGH — 100 % dependent on Apple/Google API availability and policies |
| **Required existing modules** | Orbit (messaging), Marketplace, AI router, Edge functions, Stripe Connect, WebView sandbox | Radar, Orbit, Marketplace, AI concierge (read-only), partner onboarding | AI router (App Intents bridge), Orbit (identity), Supabase edge functions |
| **Blockers before execution** | Stabilisation gates + crawler PoC + SDK design + WebView sandbox policy review | Stabilisation gates + city partner agreements + AI concierge read-only scope | Stabilisation gates + Apple EntitlementRequest + Gemini Extension approval |

---

## 3. Detailed Classification per Plan

### 3.1 Plan A — Open Marketplace Protocol

| Attribute | Rating | Notes |
|---|---|---|
| Business value | ★★★★★ | Eliminates platform extractivism; strong merchant acquisition story |
| Technical feasibility | ★★☆☆☆ | LLM crawler for menu/photo ingestion is R&D-stage; sandboxed mini-app runtime is complex |
| Regulatory risk | HIGH | Ingesting third-party site content triggers RGPD Art. 6 lawful basis questions; payment splits require PCI-DSS Level 1 |
| Time to market | 18–36 months | Partner SDK adoption curve alone is 12+ months |
| Dependency risk | HIGH | AI crawler accuracy, anti-bot measures on partner sites, SDK installation willingness |
| Required modules | Orbit · Marketplace · AI router · Edge functions · Stripe Connect · WebView sandbox (new) | WebView sandbox does not exist yet |
| Blockers | (1) Stabilisation gates · (2) Legal opinion on data ingestion · (3) Crawler PoC · (4) SDK v0 design · (5) App Store WebView policy review | Cannot start until all 5 cleared |

### 3.2 Plan B — Vertical AI Hub

| Attribute | Rating | Notes |
|---|---|---|
| Business value | ★★★★☆ | Premium positioning; strong B2B SaaS revenue per city; expandable |
| Technical feasibility | ★★★★☆ | Leverages all existing modules; scoped surface area per pilot city |
| Regulatory risk | MEDIUM | Regional data residency (UAE PDPL for Dubai); no cross-border transfer in pilot |
| Time to market | 6–12 months for Dubai pilot | Most modules already exist; gap is partner onboarding flow + AI concierge |
| Dependency risk | LOW–MEDIUM | Supabase stability + local partner agreements; no Big Tech API dependency |
| Required modules | Radar · Orbit · Marketplace · partner onboarding · AI concierge (read-only) | All present; AI concierge scoped to read-only in Phase 1 |
| Blockers | (1) Stabilisation gates · (2) Dubai partner agreements · (3) AI concierge read-only scope locked | 3 blockers — all resolvable within stabilisation window |

### 3.3 Plan C — Invisible Super App

| Attribute | Rating | Notes |
|---|---|---|
| Business value | ★★★☆☆ | Excellent distribution leverage; brand remains invisible; lock-in risk |
| Technical feasibility | ★★★★★ | App Intents, Gemini Extensions, Live Activities are stable public APIs |
| Regulatory risk | LOW | Minimal data stored; identity and consent delegated to Big Tech |
| Time to market | 3–9 months for first integration | Fastest path to user distribution |
| Dependency risk | VERY HIGH | Apple/Google can revoke API access or change policies without notice |
| Required modules | AI router · Orbit (identity) · Edge functions | Lightweight; but AI router must be defect-free first |
| Blockers | (1) Stabilisation gates · (2) Apple EntitlementRequest approval (no guaranteed timeline) · (3) Gemini Extension review (closed beta) | External approval timelines uncontrollable |

---

## 4. Recommended Execution Order

### Phase 0 — Stabilisation (Current)

**Objective:** Clear all technical debt and quality gates before any product work.

| Gate | Owner | Status |
|---|---|---|
| Build green (Vite, no React chunk split) | Engineering | Required |
| Playwright Chromium / Firefox / WebKit green | QA | Required |
| No conflict markers in `supabase/` or `src/` | Engineering | Required |
| Contract matrix green | Engineering | Required |
| Secret / security scan green | Security | Required |
| Supabase env valid (all edge functions deployable) | DevOps | Required |
| Duplicate `export function` blocks eliminated | Engineering | Required |

**Exit criterion:** ALL gates green on origin/main for 5 consecutive CI runs.

---

### Phase 1 — Vertical AI Hub Pilot (Dubai)

**Objective:** Launch a single-city, feature-constrained hub to validate the super app model with real partners and real users.

**Scope:**
- Radar (driver/service tracking) live in Dubai
- Orbit (E2EE messaging) between client ↔ driver ↔ hotel
- Marketplace (hotels, food, transport) with manual partner onboarding
- AI concierge in **read-only** mode (suggestions, no autonomous booking)
- No wallet / no Stripe Connect yet (cash or existing payment links)

**Entry criteria:** Phase 0 gates fully cleared.

**Exit criterion:** ≥ 3 active partner categories, ≥ 100 bookings/week, AI concierge satisfaction ≥ 4/5.

---

### Phase 2 — Open Marketplace Protocol

**Objective:** Open the platform to self-service partner onboarding worldwide, starting from Phase 1 learnings.

**Scope:**
- Partner SDK (lightweight JS snippet — no full crawler)
- Structured data ingestion (schema.org JSON-LD — partner-supplied, not scraped)
- Wallet + Stripe Connect (split payments, 1–2 % commission)
- Multi-city expansion from Dubai learnings
- WebView sandbox for approved partner micro-UIs (App Store compliant)

**Entry criteria:** Phase 1 exit criteria met + legal sign-off on data ingestion model + PCI-DSS scoping complete.

---

### Phase 3 — OS / Assistant Integrations

**Objective:** Distribute Easy Locs services through Big Tech assistant surfaces as a complementary channel (not a replacement for the app).

**Scope:**
- Apple App Intents (Siri Shortcuts) for booking and status queries
- Google Gemini Extension for search and recommendations
- Android / iOS Live Activities for ride and delivery status
- Microsoft Copilot plugin (B2B travel vertical)

**Entry criteria:** Phase 2 stable + Apple EntitlementRequest approved + Gemini Extension access granted.

---

## 5. Strict Entry Gates Before Any Implementation

The following gates are non-negotiable. **No post-stabilisation feature work may begin until every gate is green.**

### Gate 1 — Build Green

```
npm run build
```

- Zero TypeScript errors
- Zero Vite build errors
- React chunk must be a single unified `vendor-react` chunk (react + react-dom + react/jsx-* + scheduler + react-is)
- No `vendor-react-dom` / `vendor-react-core` split (causes runtime `TypeError: __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE`)
- `CRITICAL_CHUNK_BUDGET_OVERRIDES_KB["vendor-react"]` ≥ 450 KB

### Gate 2 — Playwright Green (All Browsers)

```
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

- Zero failures across Chromium, Firefox, WebKit
- All 7 main routes must boot without JS errors

### Gate 3 — No React Chunk Split

Verified automatically by Gate 1, but must also be confirmed by the chunk budget plugin output in CI. The following must NOT appear in build artefacts:

- `vendor-react-dom-[hash].js`
- `vendor-react-core-[hash].js`

### Gate 4 — No Conflict Markers

```bash
git grep -nE '^(<{7}|={7}|>{7}) ' supabase/ src/
```

Must return **empty output**. Any `<<<<<<<`, `=======`, or `>>>>>>>` marker in `supabase/` or `src/` is a deploy blocker.

### Gate 5 — Contract Matrix Green

```
npm run contracts:matrix:ci
```

All edge-function contracts must pass. `docs/edge-functions-contract-matrix.*` must be committed and up to date.

### Gate 6 — Secret / Security Scan Green

```
bash scripts/secret-scan.sh
npx ts-node scripts/security-inventory-edge-functions.ts
```

- Zero secrets detected
- Zero high/critical vulnerabilities in edge function inventory
- `docs/security/` files committed and current
- E2EE tests green: `npx vitest run src/lib/__tests__/orbit-double-ratchet.test.ts`

### Gate 7 — Supabase Env Valid

- All edge functions deployable without error
- No duplicate `export function` blocks in any `_shared/` file
- `supabase/functions/_shared/ai-router.ts` must have exactly one `export async function parseChatResponse`
- `supabase db push --dry-run` succeeds on staging

---

## 6. MVP — Dubai Hub (First Pilot City)

### 6.1 Included in MVP

| Module | Scope | Notes |
|---|---|---|
| **Radar** | Real-time driver and service tracking in Dubai geo-boundary | Existing module; enable geo-fence config for Dubai |
| **Orbit** | E2EE messaging between client, driver, hotel concierge | Existing module; enable multi-party threads for hotel use case |
| **Marketplace** | Hotel listings, food delivery, transport booking | Manual partner onboarding only in MVP; no self-service SDK |
| **Partner onboarding** | Admin-assisted onboarding flow: profile, menu/photos upload, availability calendar | No automated ingestion; partner supplies structured data manually |
| **AI concierge (read-only)** | Suggestions for restaurants, activities, transport based on user location and preferences | No autonomous actions; no booking without explicit user confirmation |

### 6.2 Deferred to Post-MVP

| Item | Phase | Reason |
|---|---|---|
| Wallet / Stripe Connect | Phase 2 | PCI-DSS scoping not complete; cash/existing payments sufficient for pilot |
| Self-service partner SDK | Phase 2 | Requires legal sign-off and SDK design |
| AI concierge autonomous booking | Phase 3+ | Trust and safety framework must be defined first |
| Multi-city expansion | Post-Phase 1 exit | Validate model in one city before scaling |

### 6.3 Dubai Hub Success Metrics

| Metric | Target (90 days post-launch) |
|---|---|
| Active partner categories | ≥ 3 (transport, hotel, food) |
| Weekly bookings | ≥ 100 |
| AI concierge satisfaction | ≥ 4.0 / 5.0 |
| Orbit message delivery reliability | ≥ 99.5 % |
| Radar tracking uptime | ≥ 99.9 % |
| Partner onboarding time | ≤ 48 hours from sign-up to live |

---

## 7. Explicit Out-of-Scope Items

The following items are **explicitly excluded** from Phase 0 and Phase 1 (Dubai Hub MVP). Any work on these items before Phase 1 exit criteria are met is blocked.

| Item | Reason |
|---|---|
| **Global AI crawler** | Legal risk (RGPD Art. 6 lawful basis for scraping); technical risk (anti-bot mitigations); not needed for partner-supplied data model |
| **Arbitrary mini-app execution** | Violates Apple App Store Review Guidelines §2.5.6; requires WebView sandbox not yet built |
| **Fintech rails (wallet, IBAN, lending)** | Requires financial license per jurisdiction; PCI-DSS Level 1 audit; out of current regulatory scope |
| **Audi / automotive integration** | Android Automotive OS integration requires separate SDK and OEM agreement; not a dependency for super app MVP |
| **AI autonomous actions in production** | Trust and safety framework undefined; liability model unclear; concierge is read-only in Phase 1 |
| **Multi-region data federation** | Cross-border data transfers require DPA agreements; tackle post-Phase 1 |
| **OS-level assistant integrations** | Phase 3 only; Apple EntitlementRequest and Gemini Extension access are external dependencies |

---

## 8. Final Verdict

### Recommended Plan: Plan B — Vertical AI Hub

**Rationale:**

1. **Highest technical feasibility** given existing modules (Radar, Orbit, Marketplace, AI router).
2. **Manageable regulatory risk** — UAE PDPL compliance for Dubai is well-defined; no cross-border data complexity in pilot.
3. **Fastest path to real-world validation** — 6–12 months to pilot launch vs 18–36 months for Plan A.
4. **Lowest dependency risk** — no Big Tech API approval required (unlike Plan C), no partner SDK adoption curve (unlike Plan A).
5. **Expandable** — Phase 2 adds Plan A's open protocol layer; Phase 3 adds Plan C's assistant integrations. Plan B is the correct foundation, not a dead end.

### Stabilisation Gate Status

| Gate | Current Status |
|---|---|
| Build green | ⚠️ BLOCKED — React chunk split defect present |
| Playwright green | ⚠️ BLOCKED — dependent on build fix |
| No conflict markers | ⚠️ BLOCKED — merge artifacts in edge functions |
| Contract matrix green | ⚠️ UNKNOWN — requires CI run |
| Secret / security scan green | ⚠️ UNKNOWN — requires CI run |
| Supabase env valid | ⚠️ BLOCKED — duplicate export defect in ai-router.ts |

### Final Verdict

```
BLOCKED
```

**Reason:** Stabilisation gates 1, 3, and 7 are confirmed failing based on known defects (React chunk split, conflict markers in supabase/ edge functions, duplicate `parseChatResponse` export). No post-stabilisation feature work — including Dubai Hub MVP — may begin until all 7 gates are green on origin/main for 5 consecutive CI runs.

**Next action:** Clear Phase 0 stabilisation gates before revisiting this document. When all gates are green, update this document's verdict to `STRATEGY_DOC_READY` and initiate Phase 1 partner agreements for Dubai.

---

*This document is strategy-only. No source code, workflow, or package changes are implied or authorised by this document.*
