# Phase B: DOM Repair Pipeline — Pre-Implementation Design

## Status: AWAITING REVIEW — No code until approved

---

## 1. Typed Rule Priority

### Current State (Phase A)
Five priority tiers exist in `repair-hardening.ts`:
```
critical_layout (0) > severe_visibility (1) > text_integrity (2) > i18n_surface (3) > cosmetic_layout (4)
```
Rules are sorted by `comparePriority()` and the first regex match wins.

### Phase B Design
**No structural changes needed.** The priority system is already fully typed, ordered, and integrated into storm suppression (`shouldSuppressByPriority`). What Phase B adds:

- **Rule conflict resolution**: When the UI repair bridge batches multiple issues for the same element (e.g., overflow + tap target on the same button), the pipeline currently processes them sequentially. Phase B will add a **pre-pipeline dedup step** in `ui-repair-bridge.ts` that:
  - Groups batched issues by `elementId`
  - For same-element conflicts, keeps only the highest-priority rule
  - Emits a `superseded_by_higher_priority_rule` rejection record for dropped candidates
  - Logs supersession in the proof system

- **Cross-domain priority**: If taxonomy and UI bridges both emit events for the same repair cycle, the pipeline processes them in FIFO order. Phase B will NOT change this — cross-domain priority ordering introduces coupling that increases storm risk. Each bridge flushes independently.

### Files Modified
- `ui-repair-bridge.ts`: Add `deduplicateByElement()` before flush

---

## 2. Confidence Scoring Model

### Current State (Phase A)
`repair-hardening.ts` defines 8 weighted signals:
```
detectorCertainty:   25%
elementVisibility:   15%
elementSizeSanity:   10%
domStability:        10%
selectorSpecificity: 10%
corroboratingSignals:10%
priorSuccessRate:    10%
metricStrength:      10%
```
Base threshold: 0.6. Wrapper threshold: 0.8. Storm increases thresholds dynamically.

`buildConfidenceSignals()` populates signals from live DOM measurements (visibility, size, selector quality) when an element reference is available, or falls back to conservative defaults (0.5 specificity, 1.0 stability) when it isn't.

### Phase B Design
**No structural changes to the scoring formula.** The 8-signal weighted model is sound.

Phase B addresses one gap: `successRateForTarget()` currently returns a hardcoded `0.7`:

```ts
// Current (hardcoded)
function successRateForTarget(target: string): number {
  return 0.7;
}
```

Phase B will implement **actual success rate tracking**:

- **Storage**: In-memory `Map<string, { accepted: number; total: number }>` keyed by `target`
- **Update**: After each pipeline completion, update the target's record based on outcome
- **Fallback**: Returns 0.7 if fewer than 3 data points exist for a target (same as current)
- **Decay**: Exponential moving average with alpha=0.3 to weight recent results higher
- **Cap**: Never returns below 0.1 (prevents permanent zero-confidence lockout)
- **Reset**: Cleared on `resetHardeningState()`

### Files Modified
- `repair-pipeline.ts`: Replace hardcoded `successRateForTarget()` with actual tracker
- `repair-hardening.ts`: Add `SuccessRateTracker` class with update/query/reset

---

## 3. Cooldown and Anti-Oscillation

### Current State (Phase A)
Fully implemented in `repair-hardening.ts`:

| Parameter | Value |
|-----------|-------|
| Text/i18n base cooldown | 30s |
| UI base cooldown | 60s |
| Layout base cooldown | 120s |
| Wrapper base cooldown | 300s |
| Escalation factor | 1.5x – 2.0x per repeat |
| Max cooldown | 5min – 30min |
| Oscillation threshold | 3 state toggles |
| Oscillation quarantine | 10 minutes |
| State history depth | 5 entries |
| Max cooldown entries | 500 |
| Max oscillation entries | 200 |

Pipeline checks: `isElementOnCooldown()` and `isElementQuarantined()` are both evaluated in the classify stage, producing `cooldown_active` or `oscillation_quarantined` rejections.

### Phase B Design
**No changes.** The cooldown/anti-oscillation system is complete and correctly integrated. The escalation curve, oscillation detection via state hash history, and quarantine with auto-expiry are all production-ready.

One monitoring addition: Phase B will add a `cooldown_hit` counter to the hardening report so we can observe cooldown frequency without parsing individual proofs.

### Files Modified
- `repair-hardening.ts`: Add `cooldownHitCount` counter, increment in `isElementOnCooldown()` when returning true, expose in `getHardeningReport()`

---

## 4. Adaptive Mutation Budget

### Current State (Phase A)
Implemented in `repair-hardening.ts`:

| Parameter | Value |
|-----------|-------|
| Base budget per cycle | 10 |
| Min budget | 3 |
| Storm adjustments | degraded: 50%, storm: min(3), quarantined: 0 |
| Page complexity multiplier | 0.5x – 2.0x |
| Per-rule mutation costs | 1 (text/i18n), 2 (data/cache), 3 (layout overlap), 5 (reserved) |
| Budget check | classify stage (pre-check) + repair stage (consumption) |
| Over-budget tracking | `recordOverBudgetCycle()` feeds storm escalation |

### Phase B Design
**No structural changes.** The budget system is correctly layered with storm control.

One refinement: **budget carry-over prevention**. Currently `resetBudget()` is called externally. Phase B will ensure each pipeline run starts with a fresh budget reset if the prior cycle completed, preventing stale budget state from leaking across unrelated repair batches.

Implementation: Add `lastBudgetResetAt` timestamp. In `executePipeline()`, if `Date.now() - lastBudgetResetAt > 5000`, auto-reset budget before proceeding.

### Files Modified
- `repair-hardening.ts`: Add `lastBudgetResetAt`, auto-reset logic in `canAffordMutation()`
- `repair-pipeline.ts`: Call `resetBudget()` at start of `executePipeline()` with storm level

---

## 5. Global Storm Control

### Current State (Phase A)
Fully implemented in `repair-hardening.ts`:

| Level | Trigger | Effect | Recovery |
|-------|---------|--------|----------|
| normal | < 15 events/30s | Full budget, base thresholds | — |
| degraded | 15+ events/30s | 50% budget, +0.1 threshold, suppress cosmetic | 2 min |
| storm | 30+ events/30s | Min budget (3), +0.2 threshold, suppress i18n+ | 2 min |
| quarantined | 60+ events/30s | Zero budget, threshold 1.1 (impossible), suppress all | 5 min |

Additional triggers: domain concentration (70%+ from single domain adds +10 effective count), requeue threshold (10+ requeues), over-budget cycles (3+).

Pipeline integration: `stageDetect()` rejects if quarantined. `stageClassify()` checks `shouldSuppressByPriority()`. Confidence thresholds are dynamically raised via `getConfidenceThresholdForStorm()`.

### Phase B Design
**No changes.** The storm system is comprehensive with multi-signal escalation, domain concentration detection, and automatic recovery timers.

---

## 6. Wrapper Hardening Rules

### Current State (Phase A)
`validateWrapperForRepair()` in `repair-hardening.ts` performs:

1. **Sensitive ancestry check**: Rejects if inside `form`, `[data-auth]`, `[data-payment-form]`, `[data-wallet-form]`, `[role='dialog']`, `[data-modal]`, `[data-overlay]`
2. **Interactive descendant check**: Rejects if contains `input`, `select`, `textarea`, `button[type='submit']`, `[contenteditable]`, `[role='slider']`, `[role='spinbutton']`
3. **Animation risk check**: Flags `data-framer-appear-id`, `data-motion-pop-id` — rejects if combined with uncertain wrapper role
4. **Overflow confirmation**: Requires measured `scrollWidth > clientWidth + 2` or `scrollHeight > clientHeight + 2` with `overflow: hidden/clip`
5. **Post-mutation validation**: `validateWrapperImprovement()` measures actual overflow reduction

Pipeline integration:
- Wrapper threshold elevated to 0.8 (vs 0.6 base)
- `stageLocalize()` runs wrapper validation for `wrapperMutation: true` rules
- `stageValidate()` runs `validateWrapperImprovement()` and rolls back if overflow not reduced

DOM safety in `repair-actions.ts`:
- `isElementSafeForRepair()`: Must be inside `#root`, not `data-repair-frozen`, not in forbidden selectors
- `canMutateDom()`: Hard cap of 10 mutations per run
- `recordDomSnapshot()` / `restoreDomSnapshot()`: WeakMap-based full `outerHTML` rollback

### Phase B Design
**No structural changes.** The wrapper hardening is the most conservative subsystem and should remain so.

One addition: Phase B will add a **wrapper repair audit log** — when a wrapper repair is rejected, the rejection reason + element selector path will be logged to the proof record's `detail` field for post-mortem analysis. This is observability-only, no behavioral change.

### Files Modified
- `repair-pipeline.ts`: Enrich `stageLocalize()` rejection detail with element path

---

## 7. Pipeline Authority Model

### Current State (Phase A)
The pipeline enforces a **rule-based authority model** — no mutation proceeds without:

1. **Platform flag**: `enable_repair_pipeline` must be ON
2. **Activation sheet**: Domain must be registered via `registerAllActivationSheets()`
3. **Matching rule**: `matchRepairRule()` must find a `DomainRepairRule` with matching `issuePattern`
4. **Operation allowlist**: `isOperationAllowed()` must approve the operation type
5. **Domain-operation check**: `isDomainOperationAllowed()` validates operation + level for the domain
6. **Safety checks**: No storm, no circular loop, `canAttemptRepair()` passes
7. **Financial domain block**: Wallet/payment/billing/settlement/ledger/fraud blocked from L3/L4
8. **Confidence gate**: Score must exceed dynamic threshold
9. **Budget gate**: Mutation cost must fit within cycle budget

All 9 gates are checked BEFORE any mutation occurs. Failure at any gate produces a typed `RejectionReason` and a proof record.

### Phase B Design
**No changes to the authority model.** All 9 gates remain intact.

Phase B's contribution is wiring the **UI repair bridge events through these existing gates** end-to-end. Phase A established the bridge (`ui-repair-bridge.ts`) and the rules, but the actual DOM mutation executors in `repair-actions.ts` need to be connected to real DOM patching functions.

Specifically:
- `executeRepairAction()` currently returns synthetic before/after state for DOM targets
- Phase B will connect it to the actual detector functions from `detectors.ts`, `utils.ts`, and `textAudit.ts` so that:
  - "before state" = actual DOM snapshot via `recordDomSnapshot()`
  - "repair" = actual CSS/text/attribute patch
  - "after state" = post-patch DOM snapshot
  - "rollback" = `restoreDomSnapshot()` using WeakMap

This means the pipeline stages (validate, regress, accept_or_rollback) will operate on real DOM state, not synthetic data.

### Files Modified
- `repair-actions.ts`: Connect DOM repair executors to real patching functions
- New file: `dom-repair-executors.ts` — maps rule targets to specific DOM operations

---

## 8. Proof/Rejection Structure

### Current State (Phase A)
`ProofRecord` in `proof-system.ts` captures:

| Field | Type | Purpose |
|-------|------|---------|
| id | string | Unique proof identifier |
| pipelineRunId | string | Groups proofs from same pipeline run |
| repairChainId | string | Tracks repair chains for circular loop detection |
| engineId | string | Source engine |
| domain | string | Target domain |
| repairLevel | RepairLevel | L1-L4 |
| detection | DetectionSignal | Raw signal data |
| rootCause | RootCause | Localized component + confidence |
| mutation | Mutation | Before/after state + timestamps |
| validationChecks | ValidationCheck[] | Post-repair checks |
| regressionChecks | ValidationCheck[] | Regression scan results |
| outcome | ProofOutcome | accepted/rolled_back/timed_out/blocked/etc. |
| stages | StageRecord[] | Per-stage timing and results |
| confidence/threshold/signals | number/ConfidenceSignals | Full confidence audit trail |
| budgetCost/budgetRemaining | number | Budget state at decision point |
| cooldownState | string | Cooldown status at decision point |
| stormState | StormLevel | Storm level at decision point |
| rejectionReason | RejectionReason | Typed rejection reason (13 values) |

13 typed rejection reasons:
```
superseded_by_higher_priority_rule
invalid_after_revalidation
insufficient_confidence
cooldown_active
budget_exceeded
storm_suppressed
oscillation_quarantined
wrapper_role_uncertain
interactive_descendants_present
layout_improvement_not_confirmed
sensitive_ancestry_detected
element_not_found
pipeline_disabled
domain_blocked
```

Persistence: In-memory buffer (1000 max) + localStorage (`el-repair-proofs`, 100 max).

### Phase B Design
**No structural changes to ProofRecord.** The schema is comprehensive.

Phase B adds:
- **Rejection aggregation**: A lightweight counter in `repair-hardening.ts` that tracks rejection counts by reason, queryable via `getHardeningReport()`. This enables dashboarding without parsing individual proofs.
- **Proof compaction**: After 500 proofs in-memory, compact old accepted proofs to summary records (keeping rejections and rollbacks at full fidelity for debugging).

### Files Modified
- `repair-hardening.ts`: Add `rejectionCounters: Map<RejectionReason, number>`
- `proof-system.ts`: Add compaction logic in `recordProof()` when buffer exceeds 500

---

## Summary of Phase B Scope

| Area | Phase A Status | Phase B Work |
|------|----------------|--------------|
| Typed rule priority | Complete | Add same-element dedup in UI bridge |
| Confidence scoring | Complete | Replace hardcoded success rate with tracker |
| Cooldown/anti-oscillation | Complete | Add cooldown hit counter (observability) |
| Adaptive mutation budget | Complete | Add auto-reset + carry-over prevention |
| Global storm control | Complete | No changes needed |
| Wrapper hardening | Complete | Add rejection audit detail (observability) |
| Pipeline authority | Complete | Wire DOM executors to real patching |
| Proof/rejection structure | Complete | Add rejection counters + proof compaction |

### Key Principle
Phase A established far more infrastructure than originally scoped. Most hardening subsystems are already production-ready. Phase B is primarily about:
1. **Wiring real DOM mutations** through the existing gates (the main implementation work)
2. **Observability improvements** (counters, audit detail, success rate tracking)
3. **Small robustness fixes** (budget auto-reset, proof compaction)

### Files Created (1)
- `dom-repair-executors.ts`: Maps rule targets → actual DOM patch functions

### Files Modified (5)
- `repair-pipeline.ts`: Budget reset, success rate tracker integration
- `repair-hardening.ts`: Success rate tracker, cooldown counter, rejection counters, budget auto-reset
- `ui-repair-bridge.ts`: Same-element dedup before flush
- `repair-actions.ts`: Connect to real DOM executors
- `proof-system.ts`: Proof compaction

### Files NOT Modified (Locked)
- `repair-safety.ts` — Phase 1 locked
- `engine-feature-flags.ts` — Phase 1 locked
- `domain-health.ts` — Phase 1 locked
- `types.ts` — Phase 1 locked
- `proof-system.ts` core types — Schema frozen (only compaction logic added)
- `domain-activation-sheets.ts` — Phase 1 locked
- `domain-repair-rules.ts` — Phase A locked (rules are complete)

### Risk Assessment
- **Low risk**: All changes are either observability (counters/logs) or connecting existing plumbing
- **No new repair levels**: Everything remains L2
- **No new domains**: Same 9 activation sheets
- **No financial domain changes**: Wallet/payment remain fully blocked
- **Rollback safe**: All DOM executors use existing WeakMap snapshot/restore pattern
