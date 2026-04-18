# Controlled Self-Evolution Policy (Level C → D Prep)

This policy governs how DevOS agents are allowed to participate in the
evolution of this codebase. It is the binding contract enforced in code by
`src/devos/evolution/`. Any change to autonomous behaviour MUST update this
document first; code that contradicts this document is considered a
safeguard violation and must be rejected.

---

## 1. Levels of autonomy

| Level | Name                    | Status   |
|-------|-------------------------|----------|
| A     | Read-only audit         | Enabled  |
| B     | Suggest fixes (no exec) | Enabled  |
| C     | Approved-execution loop | Enabled (this policy) |
| D     | Full self-overload      | **DISABLED** behind feature flag `LEVEL_D_ENABLED` |

The current effective level is **C**. Level D code paths exist but are
locked behind `evolutionConfig.LEVEL_D_ENABLED`, which defaults to `false`
and may only be flipped by a human operator with audit log evidence.

---

## 2. What agents MAY do autonomously

- Run audits and produce findings.
- Convert findings into **proposed** tasks with full context (intent, files,
  risks, rollback plan).
- Persist proposals into the approval queue.
- Read project memory, registry state, and prior proofs.
- Emit monitoring events (logs, metrics, escalations).

## 3. What agents MUST NOT do autonomously

- Spawn other agents. Agents are static, registered actors; runtime spawning
  of new agent kinds is a hard violation.
- Execute repairs without an `approved` proposal in the registry.
- Modify canonical files listed in `.local/level-c-planning/LEVEL_C_READINESS.md`
  section "Canonical systems are read-only".
- Auto-merge code, auto-deploy, or trigger CI promotion.
- Re-emit a proposal that has already been rejected with the same content
  hash (recursive proposal loop).
- Recurse: a proposal produced by a repair execution may NOT itself trigger
  another planner cycle within the same pipeline depth.

## 4. Approval requirements

Every proposal passes through a **single chokepoint** (`approval.ts`).
Transitions:

```
suggested ──(human OR commander-with-authority)──► approved ──► executing ──► completed
        \                                                     \
         └──(commander OR human)──► rejected                   └──► failed ──► rolled-back
```

- `suggested → approved` requires either:
  - A human approver (`approver.kind === 'human'`), OR
  - The Commander when `proposal.requiresHumanApproval === false` AND the
    proposal passes every safeguard. Commander auto-approval is itself
    audited and rate-limited.
- `suggested → rejected` may be performed by Commander or a human and MUST
  carry a machine-readable `rejectionReason`.
- Bypass attempts (writing `approved` without going through `approval.ts`)
  are detected by registry invariants and logged as critical incidents.

## 5. Safeguards (enforced in code)

| Safeguard                     | Enforcement site            |
|-------------------------------|-----------------------------|
| Unique task IDs               | `registry.ts`               |
| Duplicate-content rejection   | `registry.ts` (content hash)|
| No recursive spawning         | `safeguards.ts` (lineage)   |
| Max pipeline depth            | `safeguards.ts`             |
| Loop detection (iteration cap)| `safeguards.ts`             |
| Max concurrent tasks          | `safeguards.ts` + config    |
| Per-cycle proposal cap        | `pipeline.ts` + config      |
| Cooldown between cycles       | `pipeline.ts` + config      |

Violations are **rejected and logged** — never silently dropped.

## 6. Limits & thresholds (defaults)

See `src/devos/evolution/config.ts` for live values. Defaults:

- `MAX_CONCURRENT_TASKS = 3`
- `MAX_PROPOSALS_PER_CYCLE = 10`
- `MAX_PIPELINE_DEPTH = 2` (audit→plan→commander→repair = depth 1)
- `MAX_ITERATIONS_PER_CYCLE = 50` (loop guard)
- `CYCLE_COOLDOWN_MS = 60_000`
- `REJECTION_ESCALATION_THRESHOLD = 5` (rejected-in-row → pause + notify)
- `LEVEL_D_ENABLED = false`

Operators may override via `setEvolutionConfig({...})`. Every override is
recorded as a proof in the observability registry.

## 7. Escalation triggers

The pipeline pauses and emits a `human-attention-required` incident when:

1. `REJECTION_ESCALATION_THRESHOLD` proposals are rejected in a row.
2. Any safeguard trips (registry invariant break, recursive spawn attempt,
   pipeline-depth overflow, loop-cap hit).
3. A repair execution causes a measurable performance regression (see
   monitoring "performance impact" view).
4. The kill-switch is engaged (`emergencyStop()`).

While paused, `submitProposal` still records suggestions but the pipeline
will not advance them to `executing`.

## 8. Rollback strategy

Every executed repair is tied to its registry entry via `registry.lineage`.
Rollback procedure:

1. Operator (or escalation handler) calls `rollbackTask(taskId)`.
2. The repair agent's `rollbackPlan` (captured at proposal time) is
   replayed via `safePatchPipeline.rollbackPatch`.
3. The registry entry transitions to `rolled-back` and the proof is logged.
4. The originating proposal's content hash is **banned for 24h** to prevent
   immediate re-proposal of the same change.

## 9. Level D unlock procedure (informational, not yet active)

Level D may only be enabled when:

- 30 consecutive days of Level C operation with zero safeguard trips.
- Documented post-mortem of every escalation in that window.
- An operator with platform-admin role flips `LEVEL_D_ENABLED` AND signs
  a proof entry of type `policy-change`.
- Until that happens, every code path that checks `LEVEL_D_ENABLED` MUST
  default to the Level C behaviour.

---

_Last updated: this document is the source of truth for the evolution
chokepoint. Tests in `src/devos/evolution/__tests__/` assert the invariants
described above._
