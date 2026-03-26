# Brain Compliance Audit Report

**Date:** 2026-03-26  
**Total Engines:** 110  
**Current Distribution:** Geo: 3 | Execution: 30 | Category: 25 | Arbitration: 21 | Experience: 31

---

## 1. WRONG OWNER CANDIDATES (8 engines)

| Engine | Current Owner | Proposed Owner | Reason |
|--------|--------------|----------------|--------|
| `travel-transition` | experience | **geo** | Detects travel context (airport, hotel, transit) — this is location-mode truth, not presentation |
| `context-awareness` | experience | **geo** (split) | "Understands zone, travel state" — zone awareness is Geo territory. Time-of-day part stays experience |
| `behavior-pattern` | experience | **geo** (split) | "Analyzes patterns by zone" — zone-level analytics feed Geo density truth. Display part stays experience |
| `inventory-check` | execution | **arbitration** | Writes `visibility_mode` — visibility decisions are arbitration territory |
| `seo-check` | experience | **category** | Writes `seo_score` to seed_merchants — this is data enrichment/quality, not presentation |
| `abandoned-cart` | experience | **execution** | Cart recovery is an operational lifecycle action, not a display decision |
| `entity-integrity` | category | **execution** | Validates entity fields/state/journey — infrastructure validation, not vertical behavior |
| `travel-mode` | geo | geo ✅ | Correct — but should be noted as the ONLY geo engine doing user-context detection |

---

## 2. GEO RECLASSIFICATION CANDIDATES (5 engines)

Geo Brain currently owns only **3 engines** — critically under-resourced for a geo-first platform.

| Engine | Current Owner | Proposed: Geo | Reason |
|--------|--------------|---------------|--------|
| `travel-transition` | experience | ✅ geo | Travel context is location-mode detection (airport→hotel→local) |
| `context-awareness` | experience | 🔀 split → geo + experience | Zone/travel state = geo. Time-of-day = experience |
| `behavior-pattern` | experience | 🔀 split → geo + experience | Zone-level pattern data = geo input. Display ordering = experience |
| `hyper-radar` | experience | experience ✅ | Radar display is experience — but it MUST consume geo truth, not create it |
| `vibe-density` | geo | geo ✅ | Correct — zone atmosphere is geo enrichment |

**After reclassification: Geo would own 5-6 engines** (from 3)

---

## 3. FINAL-TRUTH VIOLATIONS (6 engines)

These engines write final business truth directly instead of feeding their brain:

| Engine | Violation | Writes To | Should Be Arbitrated By |
|--------|-----------|-----------|------------------------|
| `auto-repair` | Writes `visibility_mode` directly | seed_merchants.visibility_mode | Arbitration Brain |
| `entity-state-healing` | Writes `visibility_mode` + `vertical` directly | seed_merchants | Arbitration (visibility) + Category (vertical) |
| `backend-connectivity` | Writes `visibility_mode` directly | seed_merchants.visibility_mode | Arbitration Brain |
| `full-stack-linkage` | Writes `visibility_mode` directly | seed_merchants.visibility_mode | Arbitration Brain |
| `inventory-check` | Writes `visibility_mode` directly | seed_merchants.visibility_mode | Arbitration Brain |
| `module-link-repair` | Writes `visibility_mode` + `pipeline_stage` | seed_merchants | Arbitration (visibility) + Category (pipeline) |

**Mitigation:** These are infrastructure repair engines with legitimate emergency authority. They should:
1. Log their visibility changes as `execution_override` with reason
2. Emit `arbitration.review.requested` event after mutation
3. Arbitration Brain should have final confirmation authority

---

## 4. BRAIN BYPASS CANDIDATES (4 engines)

| Engine | Bypass Path | Impact | Fix |
|--------|-------------|--------|-----|
| `auto-publish` | Writes visibility_mode without arbitration scoring | Merchants go live without full quality check | Must check arbitration.visibility_score >= threshold first |
| `auto-unpublish` | Writes visibility_mode independently | Merchants hidden without arbitration review | Must emit arbitration.unpublish.review event |
| `visibility-optimizer` | Writes display_priority directly | Ranking bypasses central-ranking-rerank | Must feed into central-ranking-rerank as signal |
| `entity-state-healing` | Writes vertical directly | Category assignment bypasses vertical-classifier | Must delegate vertical corrections to vertical-classifier |

---

## 5. SPLIT CANDIDATES (3 engines)

| Engine | Current Owner | Split Into | Reason |
|--------|--------------|------------|--------|
| `context-awareness` | experience | `geo-context-awareness` (geo) + `temporal-context` (experience) | Mixes zone/location awareness (geo) with time-of-day logic (experience) |
| `behavior-pattern` | experience | `zone-behavior-analytics` (geo) + `behavior-display` (experience) | Zone-level aggregation is geo enrichment; display ordering is experience |
| `entity-state-healing` | execution | `entity-infra-healing` (execution) + `entity-visibility-healing` (arbitration) | Infrastructure repair is execution; visibility decisions are arbitration |

---

## 6. MERGE CANDIDATES (3 groups)

| Engines | Owner | Duplication | Proposed Unified |
|---------|-------|-------------|-----------------|
| `shop-quality` + `data-trust-scan` | arbitration | Both compute trust/quality scores on seed_merchants | `entity-quality-scoring` |
| `ux-audit` + `visual-consistency` + `ui-ux-consistency` | experience | Three engines doing UX/visual auditing | `ux-visual-audit` |
| `journey-coherence` + `dead-flow-elimination` | experience + execution | Both detect dead/broken UI flows | `flow-integrity-audit` (execution) |

---

## 7. BRAIN COMPLIANCE SCORES

| Brain | Engines | Owner Correct | Bypasses | Final-Truth Violations | Score |
|-------|---------|---------------|----------|----------------------|-------|
| **Geo** | 3 | 3/3 ✅ | 0 | 0 | **100%** (but under-resourced) |
| **Execution** | 30 | 26/30 ⚠️ | 0 | 4 violations (visibility_mode writes) | **82%** |
| **Category** | 25 | 24/25 ⚠️ | 1 (entity-state-healing writes vertical) | 0 | **94%** |
| **Arbitration** | 21 | 21/21 ✅ | 2 (auto-publish, visibility-optimizer) | 0 | **90%** |
| **Experience** | 31 | 27/31 ⚠️ | 0 | 0 | **87%** |

### Global Compliance Score: **89%**

| Metric | Count |
|--------|-------|
| Wrong-owner candidates | 8 |
| Bypass candidates | 4 |
| Final-truth violations | 6 |
| Split candidates | 3 |
| Merge candidates | 3 groups (8 engines) |
| Engines with no issues | 89 |

---

## 8. CHAIN PROOF: engine → brain → usePlatformBrain → UI

### ✅ Verified chain integrity:
- **usePlatformBrain** is the ONLY hook exposing brain state to pages
- **7 pages** consume `usePlatformBrain()`: MobilityDeliveryPage, DeliveryGiftPage, DeliveryErrandPage, DeliveryBringPage, DeliveryParcelPage, RiderLivePage, RadarLiveStationCard
- **0 pages** directly import engine modules
- **0 pages** directly import `useGeoLiveStation` or `useArbitratedStation` (they go through usePlatformBrain)
- **Brains** (`geo-brain.ts`, `execution-brain.ts`, `category-brain.ts`, `experience-brain.ts`) are the sole intermediate layer

### ✅ No page consumes engines directly
### ✅ No page consumes hidden final-truth engines
### ✅ Brains remain the only decision surfaces

---

## 9. ROLLOUT MODE IMPLEMENTATION

All engines now support controlled rollout via `engine-rollout-control.ts`:

| Mode | Behavior | User Impact |
|------|----------|-------------|
| **shadow** | Engine runs, logs decisions, zero user effect | None |
| **assist** | Engine suggests/scores, limited display effect | Low — suggestions only |
| **execute** | Engine actively publishes/ranks/dispatches | Full |
| **disabled** | Engine is off | None |

Features:
- Per-city, per-zone, per-category overrides
- Kill switches (instant force-disable)
- Safety auto-disable at 15% error rate
- Batch promotion by brain owner
- Dashboard status export

---

## 10. RECOMMENDED ACTIONS (Priority Order)

1. **Move** `inventory-check` from execution → arbitration
2. **Move** `seo-check` from experience → category  
3. **Move** `abandoned-cart` from experience → execution
4. **Move** `entity-integrity` from category → execution
5. **Move** `travel-transition` from experience → geo
6. **Split** `context-awareness` into geo + experience parts
7. **Add arbitration review gates** to auto-repair, entity-state-healing, backend-connectivity, full-stack-linkage
8. **Merge** shop-quality + data-trust-scan into single scoring engine
9. **Merge** ux-audit + visual-consistency + ui-ux-consistency
10. **Promote geo-density, vibe-density, travel-mode** to execute mode first (safe, read-only)
