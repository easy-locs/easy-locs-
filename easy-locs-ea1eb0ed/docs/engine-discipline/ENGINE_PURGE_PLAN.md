# ENGINE PURGE PLAN
**Audit Date:** 2026-04-13
**Audit Version:** Nuclear Audit v2.0.0
**Scope:** This plan covers only engines with verdicts REMOVE, MERGE, or QUARANTINE. FIX engines (60) are handled exclusively in IMPLEMENTATION_ROADMAP.md (Bloc C) and are out of scope here.
**Engines in Purge Scope:** 56 = REMOVE 28 + MERGE 21 + QUARANTINE 7
**Full Non-KEEP Total:** 116 = REMOVE 28 + MERGE 21 + QUARANTINE 7 + FIX 60 (FIX addressed in IMPLEMENTATION_ROADMAP)
**Categories:** 4 active (Safe Remove, Remove After Replacement, Merge Then Remove, Quarantine Then Observe) + 1 reserved (Rebuild From Zero, 0 engines currently)
**Authoritative Source:** ENGINE_MASTER_REGISTRY.md — registry verdicts take precedence in all conflicts.

---

## LEGEND

| Category | Code | Definition |
|----------|------|-----------|
| Safe Remove | SAFE-RM | Engine is a dead shadow or stub with no unique logic; can be deleted immediately with no migration |
| Remove After Replacement | RM-AFTER | Engine has real callers or logic but a canonical replacement exists; remove only after replacement is confirmed live |
| Merge Then Remove | MERGE-RM | Engine has unique logic that must first be merged into its canonical target; then remove the source file |
| Quarantine Then Observe | QUAR-OBS | Engine is too risky to run but too uncertain to remove; disable immediately, watch for failures, decide in 30 days |
| Rebuild From Zero | REBUILD | Engine concept is valid but current implementation is structurally broken; scrub and rebuild with proper contract |

---

## CATEGORY 1: SAFE REMOVE (25 engines)

These engines are dead code shadows, ungoverned god-layer duplicates, or pure orphans with no unique logic. No migration required. Delete file, remove imports, close.

| # | Registry ID | Engine | File | Reason |
|---|-------------|--------|------|--------|
| 1 | ENG-044 | Runtime Health Engine | engines/governance/runtime-health-engine.ts | Shadow of ENG-014 sentinel-health-engine; duplicate governance layer |
| 2 | ENG-076 | AI Audit Simple Engines | lib/ai-audit/engines/simple-engines.ts | AI label, no model; false precision; absorbed by specialized auditors |
| 3 | ENG-079 | Master Audit Engine | lib/audit/master-audit-engine.ts | Shadow of ENG-011 sentinel-audit-engine; concurrent engine_audits writes |
| 4 | ENG-113 | Data Quality Engine (Lib Shadow) | lib/engines/data-quality-engine.ts | Shadow of ENG-057 DQ orch; concurrent dq_results writes |
| 5 | ENG-127 | Menu Presentation Engine | lib/engines/menu-presentation-engine.ts | Business logic in presentation layer; move to service layer |
| 6 | ENG-130 | Module Link Engine | lib/engines/module-link-engine.ts | Shadow of orch engine; unclear dependency; no unique logic |
| 7 | ENG-131 | Notification Engine (Lib) | lib/engines/notification-engine.ts | Shadow of ENG-239 shared/notification-engine; double-notification risk |
| 8 | ENG-141 | Real Estate Engine Registry | lib/engines/real-estate-engine-registry.ts | 5th registry; consolidate metadata into engine-metadata-registry |
| 9 | ENG-143 | SEO Engine (Lib Shadow) | lib/engines/seo-engine.ts | Shadow of ENG-238 lib/seo/seo-engine; concurrent seo_scores writes |
| 10 | ENG-149 | Unified Global Engine | lib/engines/unified-global-engine.ts | Undefined scope; no governance; existential god-layer pattern |
| 11 | ENG-152 | Vibe Density Engine | lib/engines/vibe-density-engine.ts | Undefined "vibe" metric; no governance; "vibe" is not a governed signal |
| 12 | ENG-156 | God Anti-Conflict Engine | lib/god/anti-conflict-engine.ts | Shadow of ENG-012 sentinel-conflict; god-layer bypass; no unique logic |
| 13 | ENG-157 | God Continuous Audit Engine | lib/god/continuous-audit-engine.ts | Shadow of ENG-011 sentinel-audit; god-layer bypass |
| 14 | ENG-158 | God Hyper-Optimization Engine | lib/god/hyper-optimization-engine.ts | Unbounded optimization; god-layer; no bounds, no audit trail |
| 15 | ENG-159 | God Maintenance Engine | lib/god/maintenance-engine.ts | God-layer maintenance; shadow of sentinel-healing; ungoverned |
| 16 | ENG-160 | God Observability Engine | lib/god/observability-engine.ts | Shadow of ENG-020 sentinel-telemetry; god-layer bypass |
| 17 | ENG-161 | God Quality Gate Engine | lib/god/quality-gate-engine.ts | God-layer quality gate; bypasses DQ governance path |
| 18 | ENG-162 | God Taxonomy Engine | lib/god/taxonomy-god-engine.ts | Silent taxonomy mutations; god-layer; can corrupt all classifications |
| 19 | ENG-163 | Growth Domination Engine | lib/growth/growth-domination-engine.ts | Aggressive actions; no bounds; no governance; no proof system |
| 20 | ENG-165 | Import Dedup Engine | lib/import-engine/dedup/dedup-engine.ts | Shadow of ENG-102 dedup-engine; migrate dedup logic as strategy pattern |
| 21 | ENG-220 | Radar Map God Engine | lib/radar/map-god-engine.ts | God-layer map engine; ungoverned; no unique logic beyond ENG-180 |
| 22 | ENG-225 | Ranking Engine (Legacy) | lib/ranking-engine.ts | Superseded by ENG-224 central-ranking-engine |
| 23 | ENG-232 | Listing Quality Engine | lib/runtime/listing-quality-engine.ts | Shadow; concurrent quality_scores writes with ENG-093 DQ scoring |
| 24 | ENG-233 | Provider Quality Engine | lib/runtime/provider-quality-engine.ts | Shadow; concurrent quality_scores writes with ENG-093 DQ scoring |
| 25 | ENG-243 | Source Normalization Engine | lib/source/source-normalization-engine.ts | Shadow; concurrent writes across multiple tables |

---

## CATEGORY 2: REMOVE AFTER REPLACEMENT (3 engines)

These engines have real callers or meaningful logic but are superseded by canonical versions. Remove only after the replacement is confirmed live and tested.

| # | Registry ID | Engine | File | Replacement | Prerequisite |
|---|-------------|--------|------|-------------|-------------|
| 1 | ENG-126 | Menu Intelligence Engine | lib/engines/menu-intelligence-engine.ts | ENG-120 food-menu-normalizer (as pipeline stage) | Absorb AI scoring as stage 2 of normalizer pipeline; validate output parity |
| 2 | ENG-166 | Import Merge Engine | lib/import-engine/merge/merge-engine.ts | ENG-120 food-menu-normalizer (as pipeline stage) | Confirm merge logic is covered by normalizer pipeline stage 3 |
| 3 | ENG-251 | Trust Ranking Engine | lib/trust-engine/ranking-engine.ts | ENG-224 central-ranking-engine (trust adjustments) | Extract trust-weighted adjustment formula into central-ranking-engine as plugin |

---

## CATEGORY 3: MERGE THEN REMOVE (21 engines → 14 canonical targets)

These engines contain unique logic that must be absorbed into their canonical counterpart before the source file is deleted. The registry (ENGINE_MASTER_REGISTRY.md) is the authoritative source of truth for which version is canonical.

| # | Registry ID | Source Engine | Source File | Target ID | Target Engine | Logic to Extract |
|---|-------------|--------------|-------------|-----------|--------------|-----------------|
| 1 | ENG-032 | Publish Gate Food Orch | engines/gates/publish-gate-food-orch-engine.ts | ENG-138 | Publish Gate Food Engine | Orchestration wiring only; lib version is canonical |
| 2 | ENG-033 | Publish Gate Grocery Orch | engines/gates/publish-gate-grocery-orch-engine.ts | ENG-139 | Publish Gate Grocery Engine | Orchestration wiring only; lib version is canonical |
| 3 | ENG-034 | Publish Gate Service Orch | engines/gates/publish-gate-service-orch-engine.ts | ENG-140 | Publish Gate Service Engine | Orchestration wiring only; lib version is canonical |
| 4 | ENG-036 | Anti-Conflict Engine (Governance) | engines/governance/anti-conflict-engine.ts | ENG-012 | Sentinel Conflict Engine | Runtime write-lock detection logic |
| 5 | ENG-038 | Banner Strategy Engine | engines/governance/banner-strategy-engine.ts | ENG-086 | Context Banner Engine | Governance-aware banner rules |
| 6 | ENG-040 | Layout Integrity Engine | engines/governance/layout-integrity-engine.ts | ENG-086 | Context Banner Engine | Layout-specific violation patterns |
| 7 | ENG-041 | Localization Engine | engines/governance/localization-engine.ts | ENG-164 | i18n Engine | i18n governance rules |
| 8 | ENG-042 | Media Relevance Engine (Governance) | engines/governance/media-relevance-engine.ts | ENG-096 | DQ Media Relevance Engine | Governance-specific media validation rules |
| 9 | ENG-048 | Backend Connectivity Orch Engine | engines/infra/backend-connectivity-orch-engine.ts | ENG-109 | Backend Connectivity Engine | Orch wiring only; lib version is canonical |
| 10 | ENG-049 | Full-Stack Linkage Orch Engine | engines/infra/full-stack-linkage-orch-engine.ts | ENG-122 | Full-Stack Linkage Engine | Orch wiring only; lib version is canonical |
| 11 | ENG-050 | Auto-Publish Orch Engine | engines/lifecycle/auto-publish-orch-engine.ts | ENG-107 | Auto Publish Engine | Orch wiring only; lib/engines version is canonical |
| 12 | ENG-051 | Auto-Unpublish Orch Engine | engines/lifecycle/auto-unpublish-orch-engine.ts | ENG-108 | Auto Unpublish Engine | Orch wiring only; lib/engines version is canonical |
| 13 | ENG-052 | Food Menu Normalizer Orch Engine | engines/normalizers/food-menu-normalizer-orch-engine.ts | ENG-120 | Food Menu Normalizer Engine | Orch wiring only; lib version is canonical |
| 14 | ENG-053 | Grocery Normalizer Orch Engine | engines/normalizers/grocery-normalizer-orch-engine.ts | ENG-123 | Grocery Normalizer Engine | Orch wiring only; lib version is canonical |
| 15 | ENG-054 | Menu Rebuild Orch Engine | engines/normalizers/menu-rebuild-orch-engine.ts | ENG-128 | Menu Rebuild Engine | Orch wiring only; lib version is canonical |
| 16 | ENG-055 | Service Catalog Normalizer Orch Engine | engines/normalizers/service-catalog-normalizer-orch-engine.ts | ENG-144 | Service Catalog Normalizer Engine | Orch wiring only; lib version is canonical |
| 17 | ENG-056 | Data Completeness Orch Engine | engines/quality/data-completeness-orch-engine.ts | ENG-112 | Data Completeness Engine | Orch wiring only; lib version is canonical |
| 18 | ENG-058 | Data Trust Orch Engine | engines/quality/data-trust-orch-engine.ts | ENG-114 | Data Trust Engine | Orch wiring only; lib version is canonical |
| 19 | ENG-061 | Adaptive Taxonomy Orch Engine | engines/taxonomy/adaptive-taxonomy-orch-engine.ts | ENG-103 | Adaptive Taxonomy Engine | Orch wiring only; lib version is canonical |
| 20 | ENG-062 | Category Mapping Orch Engine | engines/taxonomy/category-mapping-orch-engine.ts | ENG-110 | Category Mapping Engine | Orch wiring only; lib version is canonical |
| 21 | ENG-075 | AI Audit SEO Engine | lib/ai-audit/engines/seo-engine.ts | ENG-238 | SEO Engine (Canonical) | SEO-specific audit heuristics |

**Note on Publish Lifecycle Canonicality (CONFLICT-005/006 resolution):** Registry designates `lib/engines/auto-publish-engine.ts` (ENG-107) and `lib/engines/auto-unpublish-engine.ts` (ENG-108) as KEEP (canonical). The orch variants (ENG-050/ENG-051) are MERGE targets per Category 3 above. ENGINE_CONFLICT_MATRIX.md has been updated to reflect this resolution (CONFLICT-005 and CONFLICT-006 state ENG-107 and ENG-108 are canonical).

---

## CATEGORY 4: QUARANTINE THEN OBSERVE (7 engines)

These engines are too dangerous to run, too uncertain to remove. **Action: disable via feature flag immediately, observe 30 days for system failures, then decide REMOVE or REBUILD.**

| # | Registry ID | Engine | File | Risk | Quarantine Reason | 30-Day Test |
|---|-------------|--------|------|------|-------------------|-------------|
| 1 | ENG-001 | Omega Adaptive UX Engine | core/omega/adaptive-ux/adaptive-ux-engine.ts | HIGH | UX mutations without proof or rollback; privacy risk | Monitor: UX regression reports and privacy audit signals |
| 2 | ENG-003 | Omega Code Evolution Engine | core/omega/code-evolution/code-evolution-engine.ts | CRITICAL | Autonomous code proposals; no rejection mechanism; existential risk | Monitor: any code proposals materializing anywhere |
| 3 | ENG-004 | Omega Decision Engine | core/omega/decision/decision-engine.ts | CRITICAL | Autonomous decisions; no external validator; unbounded scope | Monitor: Omega decision accuracy and scope |
| 4 | ENG-010 | Omega Self-Improvement Engine | core/omega/self-improvement/self-improvement-engine.ts | CRITICAL | Self-modification loop; no external validator; proposal storm risk | Monitor: Omega loop stability after disable |
| 5 | ENG-104 | AI Decision Engine | lib/engines/ai-decision-engine.ts | HIGH | AI label, no model; parallel to ENG-004 with no governance; false precision | Monitor: any flows calling this directly |
| 6 | ENG-105 | Auto Acquisition Engine | lib/engines/auto-acquisition-engine.ts | HIGH | Undefined scope; autonomous acquisition without review; no bounds | Monitor: any acquisition events after disable |
| 7 | ENG-106 | Autonomous Business Engine | lib/engines/autonomous-business-engine.ts | CRITICAL | Aggressive autonomous actions; no oversight, no proof system, no rollback | Monitor: any business actions fire after disable? |

**Quarantine Protocol:**
1. Set feature flag `engine:{id}:enabled = false` immediately for each of the 7 engines above
2. Log quarantine event to ENG-015 sentinel-incident-engine with reason and timestamp
3. Watch for system degradation over 30 days
4. At day 30: review each engine — either REMOVE (if no degradation) or REBUILD (if degradation detected indicating functional dependency)

---

## CATEGORY 5: REBUILD FROM ZERO (0 engines in immediate scope)

No engines are currently identified for immediate rebuild. The following are candidates for rebuild **after quarantine observation completes** and rebuild is confirmed necessary:

| # | Engine | Rebuild Trigger | Target Architecture |
|---|--------|----------------|---------------------|
| 1 | ENG-004 Omega Decision Engine | If quarantine shows decision quality degrades | Rebuild as proof-driven decision engine with external validator |
| 2 | ENG-001 Omega Adaptive UX | If quarantine shows UX degradation | Rebuild with proof system, rollback mechanism, and A/B gate |
| 3 | ENG-010 Omega Self-Improvement | If valuable signals detected during quarantine | Rebuild as signal-only observer with no actuator capability |

---

## PURGE EXECUTION CHECKLIST

### Pre-Execution (All Categories)
- [ ] ENGINE_MASTER_REGISTRY.md reviewed and approved as authoritative source
- [ ] All conflict pairs in ENGINE_CONFLICT_MATRIX resolved per registry verdicts
- [ ] Feature flags created for all 7 quarantine candidates
- [ ] Backup of engine-metadata-registry state taken

### Phase 1: Quarantine (Week 1)
- [ ] Enable feature flags to disable all 7 QUAR-OBS engines (ENG-001, 003, 004, 010, 104, 105, 106)
- [ ] Confirm no immediate system failures within 48 hours
- [ ] Log quarantine events to ENG-015 sentinel-incident-engine

### Phase 2: Safe Removes (Week 2)
- [ ] Remove all 25 SAFE-RM files (ENG-044, 076, 079, 113, 127, 130, 131, 141, 143, 149, 152, 156–163, 165, 220, 225, 232, 233, 243)
- [ ] Remove all import references across the codebase
- [ ] Verify no TypeScript errors
- [ ] Verify no runtime errors in staging

### Phase 3: Merge Then Remove (Weeks 3–6)
- [ ] Execute each merge group in order: publish gates → conflict → banner/layout → localization → media → connectivity → lifecycle → normalizers → quality → taxonomy → SEO
- [ ] For each engine: merge logic into canonical target → validate output parity → remove source file → test
- [ ] Update ENGINE_MASTER_REGISTRY after each engine removal

### Phase 4: FIX Execution (Weeks 7–12)
- [ ] Address all 60 FIX verdicts per IMPLEMENTATION_ROADMAP
- [ ] Each FIX = dedicated scope-limited PR

### Phase 5: Quarantine Review (Day 30)
- [ ] Review all 7 quarantined engines (ENG-001, 003, 004, 010, 104, 105, 106)
- [ ] Decision: REMOVE or REBUILD for each
- [ ] Execute removes/rebuilds

### Phase 6: Remove After Replacement (After replacements live)
- [ ] Confirm ENG-120 normalizer pipeline covers ENG-126 and ENG-166 logic
- [ ] Confirm ENG-224 central-ranking-engine has trust adjustment plugin for ENG-251
- [ ] Remove 3 RM-AFTER engines (ENG-126, ENG-166, ENG-251)

---

## EXPECTED OUTCOME

| Metric | Before | After |
|--------|--------|-------|
| Total engine files | 260 | ~210 |
| Conflicting write paths | 47 | 0 |
| Ungoverned god-layer engines | 7 | 0 |
| Quarantined dangerous engines | 0 | 7 (monitored) |
| REMOVE verdict engines | 28 | 0 |
| MERGE verdict engines | 21 | 0 (absorbed) |
| Engine registries | 5 | 4 (federated) |
| Engines with proof system | ~20 | ~140 |

---

*Document generated: 2026-04-13 | Nuclear Audit v2.0.0*
