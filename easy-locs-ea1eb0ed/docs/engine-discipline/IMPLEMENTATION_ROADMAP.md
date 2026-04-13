# IMPLEMENTATION ROADMAP
**Audit Date:** 2026-04-13  
**Based on:** ENGINE_MASTER_REGISTRY + ENGINE_SCORECARD + ENGINE_CONFLICT_MATRIX + ENGINE_PURGE_PLAN  
**Total Work Items:** 116  
**Estimated Duration:** 16 weeks (5 blocs: A=2wk, B=4wk, C=4wk, D=3wk, E=3wk)

---

## ROADMAP STRUCTURE

Five execution blocs:

| Bloc | Name | Scope | Duration | Priority |
|------|------|-------|----------|----------|
| A | Critical Urgency | Conflicts that corrupt data RIGHT NOW, god-layer disable | Week 1–2 | P0 |
| B | Structural Discipline | Merge consolidation, registry federation, ownership clarity | Week 3–6 | P1 |
| C | Optimization | FIX verdicts, scope narrowing, wiring quality upgrades | Week 7–10 | P2 |
| D | Clean Learning | Proof system expansion, learning eligibility, memory consolidation | Week 11–13 | P3 |
| E | Hardening & Tests | Contract tests, quarantine resolution, regression guards | Week 14–16 | P4 |

---

## BLOC A — CRITICAL URGENCY (Week 1–2)

> **Mandate:** Stop the bleeding. These conflicts corrupt data or allow ungoverned engine execution RIGHT NOW. Every item here is a fire that may already be burning.

### A-001 — Disable All God-Layer Engines Immediately
**Priority:** P0-BLOCK  
**Conflict:** CONFLICT-001, -003, -006, -008, -014  
**Files:**
- `lib/god/anti-conflict-engine.ts` → disable via feature flag + schedule SAFE-RM
- `lib/god/continuous-audit-engine.ts` → disable + schedule SAFE-RM
- `lib/god/maintenance-engine.ts` → disable + schedule SAFE-RM
- `lib/god/observability-engine.ts` → disable + schedule SAFE-RM
- `lib/god/quality-gate-engine.ts` → disable + schedule SAFE-RM
- `lib/god/taxonomy-god-engine.ts` → **QUARANTINE IMMEDIATELY** (taxonomy mutation risk)
- `lib/god/hyper-optimization-engine.ts` → **QUARANTINE IMMEDIATELY**

**Acceptance:** All god-layer engines have feature flags set to `false`; sentinel-incident-engine logs the quarantine events; no god-layer imports remain active in boot paths.

---

### A-002 — Quarantine Autonomous/Self-Modifying Engines (Registry QUARANTINE verdicts)
**Priority:** P0-BLOCK
**Conflict:** CONFLICT-015
**Files (all 7 registry QUARANTINE engines):**
- `core/omega/adaptive-ux/adaptive-ux-engine.ts` (ENG-001) → QUARANTINE
- `core/omega/code-evolution/code-evolution-engine.ts` (ENG-003) → QUARANTINE
- `core/omega/decision/decision-engine.ts` (ENG-004) → QUARANTINE
- `core/omega/self-improvement/self-improvement-engine.ts` (ENG-010) → QUARANTINE
- `lib/engines/ai-decision-engine.ts` (ENG-104) → QUARANTINE
- `lib/engines/auto-acquisition-engine.ts` (ENG-105) → QUARANTINE
- `lib/engines/autonomous-business-engine.ts` (ENG-106) → QUARANTINE

**Note:** `lib/security-chief/ghost-engine.ts` (ENG-236) is **FIX** (not quarantine) per registry. It gets addressed in Bloc C.

**Acceptance:** Seven engines disabled via feature flags; Omega core continues to operate normally; no Omega boot failure.

---

### A-003 — Merge Publish Lifecycle Orch Shadows into Canonical Lib Engines
**Priority:** P0-DATA
**Conflict:** CONFLICT-005, CONFLICT-006
**Registry Canonical:**
- `lib/engines/auto-publish-engine.ts` (ENG-107) → **KEEP** (canonical)
- `lib/engines/auto-unpublish-engine.ts` (ENG-108) → **KEEP** (canonical)
**To Merge Then Remove:**
- `engines/lifecycle/auto-publish-orch-engine.ts` (ENG-050) → MERGE into ENG-107, then remove
- `engines/lifecycle/auto-unpublish-orch-engine.ts` (ENG-051) → MERGE into ENG-108, then remove

**Action:** Verify lib versions are the sole trigger of publish/unpublish writes. Absorb any orchestration wiring from orch variants into lib versions. Delete orch variants. Update all callers.

**Acceptance:** Zero writes to `status='published'` except through ENG-107; zero writes to `status='unpublished'` except through ENG-108; orch variants deleted.

---

### A-004 — Kill Notification/SEO/Data-Quality Shadow Engines
**Priority:** P0-DATA  
**Conflict:** CONFLICT-020, CONFLICT-021  
**Files:**
- `lib/engines/notification-engine.ts` → SAFE-RM (after import audit)
- `lib/engines/seo-engine.ts` → SAFE-RM (after import audit)
- `lib/engines/data-quality-engine.ts` → SAFE-RM (after import audit)

**Acceptance:** All callers verified; shadows deleted; canonical versions in lib/shared and lib/seo confirmed active.

---

### A-005 — Action AI Audit Engines Per Registry Verdicts
**Priority:** P0-FALSE-PRECISION
**Conflict:** CONFLICT-046
**Registry Verdicts:**
- `lib/ai-audit/engines/international-engine.ts` (ENG-073) → FIX (add proof contract)
- `lib/ai-audit/engines/marketplace-engine.ts` (ENG-074) → FIX (add proof contract)
- `lib/ai-audit/engines/seo-engine.ts` (ENG-075) → MERGE into ENG-238 (lib/seo/seo-engine.ts)
- `lib/ai-audit/engines/simple-engines.ts` (ENG-076) → REMOVE (no unique logic)
- `lib/ai-audit/engines/technical-engine.ts` (ENG-077) → FIX (add proof contract)
- `lib/ai-audit/engines/ui-ux-engine.ts` (ENG-078) → FIX (add proof contract)

**Action:** Remove ENG-076 (simple-engines.ts). Merge ENG-075 (seo-engine.ts) into ENG-238. Feature-flag ENG-073/074/077/078 to observation-only mode (findings tagged [UNVERIFIED]) until FIX work (Bloc C) adds proof contracts.

**Acceptance:** ENG-076 deleted; ENG-075 merged into canonical SEO; four FIX engines in observation mode pending Bloc C proof system work.

---

### A-006 — Resolve Critical Write Conflict: Quarantine Engines
**Priority:** P0-DATA  
**Conflict:** CONFLICT-004  
**Registry Canonical:**
- `lib/data-quality/engines/quarantine-engine.ts` (ENG-097) → **KEEP** (canonical DQ quarantine writer)
- `services/quarantine/quarantine-engine.ts` (ENG-259) → **FIX** (service-layer quarantine; align schema to ENG-097)

**Action:** Audit quarantine_queue schema; identify schema differences between ENG-097 and ENG-259; unify schema so both coexist without conflicts. Add DQ-specific trigger patterns to ENG-259 as plugins. Both engines are retained — this is a SCHEMA FIX, not a removal.

**Acceptance:** Unified quarantine_queue schema; ENG-097 and ENG-259 write compatible rows; unquarantine logic in ENG-259 correctly processes rows created by ENG-097; data integrity verified.

---

### A-007 — Resolve Critical Write Conflict: Taxonomy Engine Stack
**Priority:** P0-DATA  
**Conflict:** CONFLICT-008  
**Files:**
- `lib/god/taxonomy-god-engine.ts` → QUARANTINE (already done in A-001; confirm)

**Action:** Audit any rows in taxonomy tables with modified_by = 'taxonomy-god-engine'; flag as suspect; confirm taxonomy-integrity, adaptive-taxonomy, and taxonomy-governance engines have non-conflicting write targets.

**Acceptance:** Taxonomy write ownership documented in engine-metadata-registry; god engine fully disabled; no orphan taxonomy mutations.

---

### A-008 — Resolve Critical Write Conflict: Menu Pipeline
**Priority:** P0-DATA  
**Conflict:** CONFLICT-009  
**Action:** Temporarily disable `menu-rebuild-orch-engine` and `menu-intelligence-engine`; confirm food-menu-normalizer-orch covers all needed menu normalization; begin merge planning for menu rebuild as pipeline stage.

**Acceptance:** No concurrent menu writes; food-menu-normalizer-orch is the single menu_items writer.

---

### A-009 — Disable Remaining Dangerous Shadows
**Priority:** P0-SHADOW  
**Files (immediate SAFE-RM after import audit):**
- `lib/audit/master-audit-engine.ts`
- `lib/god/cron-orchestrator.ts`
- `lib/engines/franchise-dedup-engine.ts` (after confirming no unique callers)

**Acceptance:** Files removed; no broken imports; sentinel-audit-engine confirmed as single audit authority.

---

### A-010 — Document Emergency Quarantine Status in Incident Engine
**Priority:** P0-GOVERNANCE  
**Action:** Log all A-001 through A-009 actions as sentinel incidents with:
- Incident severity: HIGH
- Source: nuclear-audit-2026-04-13
- Resolution: see ENGINE_PURGE_PLAN
- Status: in-progress

**Acceptance:** 9+ incidents logged in sentinel-incident-engine; audit trail created.

---

## BLOC B — STRUCTURAL DISCIPLINE (Week 3–6)

> **Mandate:** Consolidate. Establish single canonical owners. Execute all MERGE-RM groups. Fix registry fragmentation.

### B-001 — Merge Group F: Dedup Consolidation
**Conflict:** CONFLICT-010  
**Target:** `lib/dedup/dedup-engine.ts`  
**Steps:**
1. Extract shadow detection heuristics from `duplicate-shadow-engine.ts` → add as `DuplicateShadowStrategy` in dedup engine
2. Extract franchise rules from `franchise-dedup-engine.ts` → add as `FranchiseStrategy`
3. Extract import adapter from `lib/import-engine/dedup/dedup-engine.ts` → add as `ImportDeduplicator`
4. Delete source files
5. Update all callers

**Acceptance:** 4 dedup engines → 1; no duplicate detection logic split; all callers use lib/dedup

---

### B-002 — Merge Group E: Media Relevance Consolidation
**Conflict:** CONFLICT-011  
**Target:** `lib/data-quality/engines/media-relevance-engine.ts` (ENG-096, registry KEEP — canonical media relevance scorer)  
**Steps:**
1. Extract governance media validation rules from `engines/governance/media-relevance-engine.ts` (ENG-042)
2. Absorb ENG-042 validation patterns into ENG-096
3. Delete engines/governance/media-relevance-engine.ts (ENG-042, after merge)
4. Note: `services/media-truth/media-truth-engine.ts` (ENG-258) handles media authenticity — a distinct scope — and is NOT removed

**Acceptance:** Single media relevance authority (ENG-096); ENG-042 removed; ENG-258 retained as authenticity engine; no parallel relevance validation

---

### B-003 — Merge Group G: Menu Pipeline Consolidation
**Conflict:** CONFLICT-009  
**Target:** `lib/engines/food-menu-normalizer-engine.ts` (ENG-120, registry KEEP — canonical menu pipeline)  
**Steps:**
1. Design pipeline stages in ENG-120: input → normalize → intelligence-score → rebuild → gate
2. Absorb menu-intelligence (ENG-126) logic as stage 2 plugin into ENG-120
3. Absorb menu-rebuild logic as stage 3 plugin into ENG-120
4. Absorb ENG-052 orch coordination logic into ENG-120 pipeline runner
5. Remove engines/normalizers/menu-rebuild-orch-engine.ts (after merge)
6. Remove lib/engines/menu-rebuild-engine.ts (after merge)
7. Remove lib/engines/menu-intelligence-engine.ts (after merge)
8. Remove engines/normalizers/food-menu-normalizer-orch-engine.ts (ENG-052, after merge into ENG-120)

**Acceptance:** Single food menu pipeline in ENG-120; 4 files removed; menu_items written by one engine (ENG-120)

---

### B-004 — Merge Group C: Quality Gate Consolidation
**Conflict:** CONFLICT-003
**Registry Verdicts:** ENG-261 (sentinel-quality-gate) = KEEP; ENG-148 (strict-quality-gate-engine) = KEEP; ENG-157 (god/quality-gate-engine) = REMOVE
**Target:** `core/sentinel/quality-gates/sentinel-quality-gate.ts`
**Steps:**
1. Extract strict thresholds from `strict-quality-gate-engine.ts` (ENG-148) as configurable parameters within ENG-148
2. Add a threshold-configuration API to sentinel-quality-gate; wire ENG-148 as the canonical threshold source
3. **DO NOT delete** strict-quality-gate-engine.ts — ENG-148 has KEEP verdict; it becomes the configurable threshold layer
4. Delete `lib/god/quality-gate-engine.ts` (ENG-157 = REMOVE; SAFE-REMOVE via Purge Plan CAT1)

**Acceptance:** Single quality gate authority (ENG-261); threshold decisions delegate to ENG-148; god/quality-gate deleted

---

### B-005 — Merge Group H+I: Banner + Layout/UX Consolidation
**Target:** lib/context-banner (banner) + lib/engines/ux-audit-engine (layout)  
**Steps:**
1. Extract governance banner rules → context-banner-engine
2. Delete engines/governance/banner-strategy-engine.ts
3. Extract layout patterns → ux-audit-engine
4. Delete engines/governance/layout-integrity-engine.ts

**Acceptance:** 2 engines removed; ux-audit-engine is single layout validator; context-banner is single banner authority

---

### B-006 — Merge Group J: Ranking Consolidation
**Conflict:** CONFLICT-018  
**Target:** `lib/ranking/central-ranking-engine.ts`  
**Steps:**
1. Extract trust-weighted formula from `lib/trust-engine/ranking-engine.ts` → add as TrustAdjustmentPlugin
2. Extract signals from `lib/ranking-engine.ts`
3. Delete both source files

**Acceptance:** Single ranking engine; lib/ranking/central-ranking-engine.ts used by all search and discovery

---

### B-007 — Registry Federation
**Conflict:** CONFLICT-012  
**Action:** Define explicit charter for each of the 4 remaining registries:
1. `lib/engines/engine-metadata-registry.ts` → **Metadata/Cockpit Registry** (tier, business function, tables)
2. `core/sentinel/registry/engine-registry.ts` → **Health/Governance Registry** (heartbeat, status, contract)
3. `lib/data-quality/engine-registry.ts` → **DQ Run Registry** (scan runs, findings)
4. `engines/engine-registry.ts` → **Boot Registry** (interval engine boot list)

**Action:** Merge `lib/engines/real-estate-engine-registry.ts` metadata entries into Metadata/Cockpit Registry. Delete source.

**Action:** Add cross-validation: every engine in Boot Registry must have an entry in Health Registry. Add startup check.

**Acceptance:** 5 registries → 4; charter documented in each file header; cross-validation check added

---

### B-008 — Remove Remaining SAFE-RM Files (Batch)
**Files from Purge Plan Category 1 not yet removed in Bloc A:**
- All remaining items from Category 1 list

**Acceptance:** All 25 SAFE-RM files deleted; zero import errors

---

### B-009 — Consolidate Sentinel Healing + Auto-Heal
**Conflict:** CONFLICT-002 (partial)  
**Target:** `core/sentinel/healing/sentinel-healing-engine.ts`  
**Steps:**
1. Extract deep structural heal patterns from `lib/auto-heal/auto-heal-engine.ts`
2. Add Omega signal port to sentinel-healing
3. Remove auto-heal-engine.ts

**Note:** `engines/governance/auto-remediation-engine.ts` (ENG-037) is **KEEP** per registry; it is NOT removed in this step.

**Acceptance:** Single repair authority for engine layer; Omega incident response routes through signal port

---

### B-010 — Cron Orchestrator Authority
**Conflict:** CONFLICT-029  
**Action:** Confirm all jobs previously registered in `lib/god/cron-orchestrator.ts` are now in `core/sentinel/scheduling/sentinel-cron-orchestrator.ts`. Remove god cron (already disabled in A-001; now delete).

**Acceptance:** Single cron orchestrator; all recurring jobs in sentinel registry

---

### B-011 — Notification Consolidation
**Conflict:** CONFLICT-020  
**Target:** `lib/shared/notification-engine.ts`  
**Action:** lib/engines/notification-engine.ts already removed in A-004; confirm lib/engines/notification-event-dispatcher.ts wires only to lib/shared/notification-engine.ts.

**Acceptance:** Single notification dispatch path

---

### B-012 — Sentinel Conflict Engine: Absorb Runtime Detection
**Conflict:** CONFLICT-001 (final resolution)  
**Action:** Absorb the runtime write-lock detection logic from `engines/governance/anti-conflict-engine.ts` (now disabled) into `sentinel-conflict-engine.ts` as a live-detection mode.

**Acceptance:** sentinel-conflict-engine has both governance-level and runtime-level conflict detection

---

## BLOC C — OPTIMIZATION (Week 7–10)

> **Mandate:** Execute all 60 FIX verdicts. Narrow scope. Fix wiring quality. Eliminate drift.

### C-001 — Fix Omega Business Opportunity Engine (ENG-002)
**Registry Verdict:** FIX
**File:** `core/omega/business-opportunity/business-opportunity-engine.ts`
**Action:** Wire to proof system; add outcome tracking for each opportunity signal; add false signal threshold; add rollback mechanism. Note: Omega Decision Engine (ENG-004) is QUARANTINE — not addressed in Bloc C, handled in A-002 quarantine and D-008 review.

### C-002 — Fix Omega Knowledge Graph
**Verdict:** FIX  
**Action:** Add external validation of knowledge quality; cross-check KnowledgeGraph against canonical taxonomy and sentinel registries

### C-003 — Clarify Omega Priority Engine (ENG-009)
**Registry Verdict:** KEEP
**Action:** Rename to `omega-strategic-priority-engine.ts`; document separation from `lib/admin/priority-engine.ts` (SLA priority); add proof system; ENG-009 is the canonical Omega-level priority authority (KEEP per registry)

### C-004 — Fix Omega Incident Response Engine (ENG-005)
**Registry Verdict:** FIX
**File:** `core/omega/incident-response/incident-response-engine.ts`
**Action:** Add Omega signal port to ENG-013 sentinel-healing-engine; migrate all Omega incident triggers to use sentinel's healing signal port; ensure no direct repair writes

### C-005 — Fix Omega Prediction Engine
**Verdict:** FIX  
**Action:** Materialize predictions as user-visible signals; add proof of prediction accuracy over 7-day window

### C-006 — Fix Sentinel Workflow Engine
**Verdict:** FIX  
**Action:** Reconcile with `lib/workflows/workflow-engine.ts`; define: sentinel manages governance workflows (audit, repair, quarantine cycles); lib/workflows manages domain workflows (booking, payment flows)

### C-007 — Fix Sentinel Conflict Engine (FIX after B-012)
**Verdict:** FIX  
**Action:** Add conflict resolution history; implement conflict arbitration rules (not just detection); wire to proof-system for conflict resolution proofs

### C-008 — Fix Taxonomy Integrity Engine (DQ)
**Verdict:** FIX  
**Action:** Define explicit non-overlap with `taxonomy-governance-engine`; add scope comment at top of each file; add test for boundary

### C-009 — Fix Taxonomy Governance Engine
**Verdict:** FIX  
**Action:** Define scope vs DQ taxonomy integrity; add violation history; wire to sentinel-quality-gate

### C-010 — Fix Adaptive Taxonomy Orch Engine
**Verdict:** FIX  
**Action:** Document feedback loop with dq-taxonomy-integrity; add adaptation proof; add max-adaptation-per-cycle guard

### C-011 — Fix Engine Learning
**Verdict:** FIX  
**Action:** Define ownership boundary with omega-memory; add API docs; test that learning signals flow correctly to auto-fix eligibility

### C-012 — Fix Engine Memory
**Verdict:** FIX  
**Action:** Document separation: engine-memory = operational fix history; add migration path to persist to Supabase for cross-session durability

### C-013 — Fix Omega Memory Boundary Protocol
**Conflict:** CONFLICT-007  
**Action:** Finalize boundary protocol document; add TypeScript interface `MemoryBoundary` defining allowed cross-reads

### C-014 — Fix Legal Engine
**Verdict:** FIX  
**Action:** Add legal rule version tracking; add change audit trail; wire to sentinel-audit-engine for compliance audits

### C-015 — Fix Entity Recovery Engine
**Verdict:** FIX  
**Action:** Rename to `entity-republish-recovery-engine.ts`; add scope docs confirming it handles visibility-mode recovery only

### C-016 — Fix Property Automation Engine
**Verdict:** FIX  
**Action:** Add test coverage for property lifecycle steps; add proof system integration

### C-017 — Fix Rent Call Engine
**Verdict:** FIX  
**Action:** Add proof system (payment-adjacent = must have proof); add explicit contract; wire to wallet-engine for validation

### C-018 — Remove Menu Presentation Engine (ENG-127)
**Registry Verdict:** REMOVE
**File:** `lib/engines/menu-presentation-engine.ts`
**Action:** This engine has REMOVE verdict (business logic in presentation layer). Move any remaining business logic to a MenuPresentationService. Delete engine file. Remove from engine orchestrator. Note: This is a removal action in Bloc C because it was discovered during FIX sweep.

### C-019 — Fix Digital Orchestration Engine (Splitting)
**Verdict:** FIX  
**Action:** Split into 4 focused engines:
- `content-strategy-engine.ts` — homepage content decisions
- `ux-quality-engine.ts` — layout quality scores
- `conversion-intelligence-engine.ts` — conversion friction analysis
- `country-calendar-engine.ts` — country/event activations

### C-020 — Remove Unified Global Engine (ENG-149)
**Registry Verdict:** REMOVE
**File:** `lib/engines/unified-global-engine.ts`
**Action:** This engine has REMOVE verdict (undefined scope, god-layer pattern). Any valid logic discovered during the C-019 split can be absorbed by the 4 new focused engines. Delete file. Do NOT split — split only applies to ENG-115 (Digital Orchestration).

### C-021 — Remove Radar Map God Engine (ENG-220)
**Registry Verdict:** REMOVE
**File:** `lib/radar/map-god-engine.ts`
**Action:** REMOVE verdict (god-layer, ungoverned). Delete file. Any unique map logic should already be covered by ENG-180 (Map Engine V2). Verify no unique callers before delete.

### C-022 — Fix Radar Cinema Engine
**Verdict:** FIX  
**Action:** Document scope; if radar cinema = animated radar transitions, keep as is; if broader, split

### C-023 — Fix Predictive Demand Engine
**Conflict:** CONFLICT-019  
**Action:** Add output port so omega-prediction can consume radar predictions; forbid omega-prediction from recomputing independently

### C-024 — Scope-Clarify Proof Log Engine (ENG-250)
**Registry Verdict:** KEEP (no structural fix required)
**Conflict:** CONFLICT-028
**Action:** Add scope comment to clarify: "trust proofs only, not repair proofs"; add bridge to engines/core/proof-system for unified reporting. DO NOT rename — KEEP engines retain their filenames. Conflict clarification only.

### C-025 — Fix User Trust Engine
**Verdict:** FIX  
**Action:** Rename to `user-trust-score-engine.ts`; document separation from `trust-score-engine.ts` (entity trust vs user trust)

### C-026 — Fix Chat Engine (Security)
**Verdict:** FIX  
**Action:** Rename to `chat-security-monitor-engine.ts`; add privacy scope documentation; confirm it does not log message content

### C-027 — Fix Workflow Engine (lib)
**Verdict:** FIX  
**Action:** Document separation (see B-010 charter); schedule RM-AFTER once sentinel-workflow covers all governance workflows

### C-028 — Fix Action Engine
**Verdict:** FIX  
**Action:** Add ActionContract interface; register all actions in engine-metadata-registry; add type safety

### C-029 — Fix Close Flow Engine
**Verdict:** FIX  
**Action:** Document "close flow" definition; add contract; confirm scope and test

### C-030 — Fix Global Support Engine
**Verdict:** FIX  
**Action:** Add contract; narrow scope; if too broad, split into support-ticket-engine and support-routing-engine

### C-031 — Deprecation-Path for Engine Connector Hub (ENG-246)
**Registry Verdict:** KEEP (no FIX required; registry shows KEEP but with deprecation risk)
**Action:** Add deprecation notice to `lib/system/engineConnectorHub.ts` (actual file path); migrate callers to `engines/core/engine-orchestrator.ts`; schedule RM-AFTER for final cleanup sprint. KEEP verdict means it remains operational during migration — do not delete until all callers are migrated.

### C-032 through C-052 — Remaining 21 FIX Items
*Apply same methodology: scope clarification + contract + proof system integration + TypeScript strictness + wiring quality upgrade for each remaining FIX engine.*

---

## BLOC D — CLEAN LEARNING (Week 11–13)

> **Mandate:** Make the engine system learn correctly. Fix proof system coverage. Fix memory architecture. Wire learning eligibility.

### D-001 — Expand Proof System Coverage
**Action:** Every engine with KEEP or FIX verdict that writes to a Supabase table must emit a ProofRecord via `engines/core/proof-system.ts`. Minimum fields: before_state, after_state, mutation, outcome, rollback capability.

**Target:** ~80 engines currently emit no proof. Add proof emission to each in order of risk (highest risk first).

### D-002 — Repair Proof Schema Standardization
**Action:** Align `engines/core/proof-system.ts` ProofRecord schema with `lib/trust-engine/proof-log-engine.ts` TrustProof schema. Define universal ProofEnvelope type.

### D-003 — Memory Architecture Document
**Action:** Write `docs/engine-discipline/ENGINE_MEMORY_PROTOCOL.md` defining:
- What goes in engine-memory (operational)
- What goes in omega-memory (strategic)
- How to create a MemoryBridgeAdapter when cross-reads are necessary
- Forbidden patterns (direct cross-reads without adapter)

### D-004 — Enable Learning for High-Eligibility Engines
**Action:** Enable learning signal collection in all engines with Learning Eligibility score ≥ 7 **and KEEP/FIX verdict** (excludes MERGE targets already removed in Bloc B):
- sentinel-quality-gate (ENG-261, KEEP)
- taxonomy-governance-engine (ENG-045, FIX)
- data-quality-scoring-engine (ENG-093, KEEP)
- adaptive-taxonomy-engine (ENG-103, KEEP — note: not the orch variant ENG-061 which is MERGE/remove)

### D-005 — Auto-Fix Eligibility Audit
**Action:** Review all engine-memory auto-apply-fixes entries; validate each fix pattern has proof_required=true; add proof gate to engine-learning.ts before a fix pattern can be promoted to auto-apply.

### D-006 — False Positive Review
**Action:** For every engine with FP-Risk score ≤ 5 in scorecard, add test suite: generate a "healthy" entity and confirm engine does NOT flag it. If engine flags healthy entities, demote to observe-only mode.

### D-007 — False Repair Review
**Action:** For every engine with FR-Risk score ≤ 6, add test: generate a "correct" entity state and confirm engine does NOT modify it. If it modifies correct data, add DRY_RUN mode guard.

### D-008 — Quarantine Engine 30-Day Review
**Action:** At day 30 post-quarantine, review all 7 quarantined engines (ENG-001, 003, 004, 010, 104, 105, 106):
- If zero degradation observed after disable → REMOVE
- If degradation observed → evaluate REBUILD
- Document decision in ENGINE_MASTER_REGISTRY (update Verdict field)

---

## BLOC E — HARDENING & TESTS (Week 14–16)

> **Mandate:** Lock the architecture. Contract tests. Regression guards. No future drift without detection.

### E-001 — Contract Test Suite
**Action:** For every engine with SentinelEngineContract implemented, add test:
- `getHeartbeat()` returns valid EngineHeartbeat
- `runAudit()` returns valid EngineAuditResult with score 0-100
- `getMetrics()` returns valid EngineMetrics
- `getDependencies()` returns stable dependency list

**Target:** 40+ contract test files in `tests/engine-contracts/`

### E-002 — Registry Integrity Test
**Action:** Add startup test that validates:
- Every engine in Boot Registry (engines/engine-registry.ts) has a Health Registry entry
- Every engine in Metadata Registry has a Boot Registry entry
- No engine IDs are duplicated across registries
- All engine IDs follow naming convention: kebab-case, max 40 chars

### E-003 — Write Conflict Detection Test
**Action:** For every engine that writes to a shared table (seed_merchants, menu_items, etc.), add test verifying field ownership per engine-metadata-registry. No engine should write fields owned by another engine.

### E-004 — Quarantine Enforcement Test
**Action:** For every engine in QUAR-OBS state, add test confirming feature flag disables execution. Engine.tick() must return immediately when `isEngineEnabled(id) === false`.

### E-005 — Proof System Coverage Test
**Action:** Add test for every engine that performs Supabase writes: verify that a ProofRecord is emitted within 5 seconds of each write. Fail test if proof missing.

### E-006 — Repair Storm Guard Test
**Action:** Add stress test: if 5 engines simultaneously attempt repairs on the same entity, `isRepairStormActive()` must return true and all repairs must be blocked. Test rollback of partial repairs.

### E-007 — Engine Naming Convention Lint
**Action:** Add ESLint rule: no file named `*-engine.ts` may reside in `lib/god/` path. Add lint rule: no `class *Engine` may be exported from files not in `engines/`, `lib/engines/`, or `core/*/` paths without an explicit architecture exception comment.

### E-008 — Post-Purge Architecture Audit
**Action:** After all blocs complete, run full Engine Nuclear Audit v2.0:
- Re-catalog all engine files (should be ~160)
- Re-score all KEEP engines (should average Fitness ≥ 80)
- Verify zero CRITICAL conflicts remain
- Verify zero God-layer engines remain
- Verify all REMOVE engines are deleted
- Publish ENGINE_MASTER_REGISTRY v2.0

### E-009 — Engine Discipline CI Gates
**Action:** Add to CI pipeline:
```
npm run lint:engines          # naming + placement rules
npm run test:contracts        # contract test suite
npm run test:registry         # registry integrity test
npm run test:write-conflicts  # write conflict detection
npm run audit:engine-count    # alert if engine count grows > 180
```

**Acceptance:** All CI gates green; engine count below 180; zero CRITICAL conflicts in conflict matrix

---

## DEPENDENCY CHAIN

```
A-001 → A-002 → A-007 (taxonomy safe after god disabled)
A-003 → A-004 (clean up shadows)
A-006 → B-009 (quarantine consolidated, healing next)
B-001 → B-008 (dedup consolidated, then batch remove)
B-003 → C-019 (menu pipeline clean, then split digital orch)
B-007 → E-002 (registry federated, then registry integrity test)
C-001 → D-001 (omega decision fixed, then proof expansion)
D-003 → D-004 (memory protocol documented, then learning enabled)
D-008 → E-001 (quarantine resolved, then contract tests)
C-001..C-052 → E-001 (all fixes done, then contract tests)
E-001..E-009 → E-008 (all hardening done, then v2 audit)
```

---

## SUCCESS CRITERIA

### Bloc A Complete When:
- Zero god-layer engines running
- Zero self-modifying Omega engines running
- Zero shadow publish engines running
- All quarantine events logged in sentinel

### Bloc B Complete When:
- Zero duplicate dedup engines
- Zero duplicate repair engines
- Zero duplicate quality gates
- Registry federation documented and cross-validated

### Bloc C Complete When:
- Zero FIX verdicts remaining in ENGINE_MASTER_REGISTRY
- All "FIX" engines have contracts
- All engines renamed to canonical names (no "god", "hyper", "unified" prefixes)

### Bloc D Complete When:
- ≥80% of write-capable engines have proof system integration
- Memory boundary protocol documented and enforced
- All quarantine engine reviews completed and documented

### Bloc E Complete When:
- Contract test suite ≥40 engines
- Registry integrity test passing
- Write conflict CI gate passing
- Engine count ≤ 180
- v2 audit published with zero CRITICAL conflicts

---

## WEEKLY EXECUTION CADENCE

| Week | Focus | Key Deliverables |
|------|-------|-----------------|
| W1 | A-001 to A-005 | God layer disabled, autonomous engines quarantined, incidents logged |
| W2 | A-006 to A-010 | Publish shadows removed, menu pipeline locked, conflict audit trail |
| W3 | B-001 to B-004 | Dedup + media + menu + quality gate merges |
| W4 | B-005 to B-008 | Banner, layout, ranking, registry merges |
| W5 | B-009 to B-012 | Healing, cron, notification, conflict absorb |
| W6 | Bloc B closure | All merges complete; 50+ files deleted |
| W7 | C-001 to C-010 | Omega FIX items |
| W8 | C-011 to C-020 | Learning, memory, digital orch split |
| W9 | C-021 to C-035 | Radar, trust, security, workflow fixes |
| W10 | C-036 to C-052 | Remaining FIX items; Bloc C closure |
| W11 | D-001 to D-004 | Proof system expansion; memory protocol |
| W12 | D-005 to D-007 | Auto-fix audit; FP/FR reviews |
| W13 | D-008 | Quarantine 30-day review and decisions |
| W14 | E-001 to E-003 | Contract tests; registry tests; write conflict tests |
| W15 | E-004 to E-007 | Quarantine tests; proof coverage; lint rules; repair storm |
| W16 | E-008 to E-009 | v2 audit; CI gates; final lock |

---

*Document generated: 2026-04-13 | Nuclear Audit v2.0.0*
