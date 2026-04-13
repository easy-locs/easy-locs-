# ENGINE CONFLICT MATRIX
**Audit Date:** 2026-04-13  
**Conflict Pairs Found:** 47  
**Critical Conflicts:** 12  

---

## LEGEND

| Field | Meaning |
|-------|---------|
| Nature | functional_overlap / write_conflict / ownership_dispute / parallel_ungoverned / detect_without_act / act_without_validation / fake_repair |
| Scope | data / execution / governance / taxonomy / memory / ui |
| Impact | H/M/L |
| Severity | CRITICAL / HIGH / MEDIUM / LOW |
| Source of Truth | Which engine should be the canonical owner |
| Resolution | MERGE_INTO / REMOVE_B / REMOVE_A / SPLIT_SCOPE / CLARIFY_CONTRACT |
| Risk if Untouched | What happens if conflict persists |
| Final State | Target architecture after conflict resolution |

---

## CRITICAL CONFLICTS (Severity: CRITICAL)

---

### CONFLICT-001
**Engine A:** `core/sentinel/conflict/sentinel-conflict-engine.ts`  
**Engine B:** `engines/governance/anti-conflict-engine.ts`  
**Engine C (3rd party):** `lib/god/anti-conflict-engine.ts`

| Field | Value |
|-------|-------|
| Nature | functional_overlap + parallel_ungoverned |
| Scope | governance / execution |
| Impact | H |
| Severity | **CRITICAL** |
| Source of Truth | `sentinel-conflict-engine` |
| What to Merge | B detects runtime write conflicts → merge detection logic into A; C is a god-layer bypass → remove entirely |
| What to Delete | engines/governance/anti-conflict-engine.ts, lib/god/anti-conflict-engine.ts |
| Risk if Untouched | Three engines claim anti-conflict authority; none is canonical; conflicts can be "resolved" by any of three with contradictory outcomes |
| Recommended Final State | Single canonical: `sentinel-conflict-engine` absorbs runtime detection from B; C removed |

---

### CONFLICT-002
**Engine A:** `core/sentinel/healing/sentinel-healing-engine.ts`  
**Engine B:** `lib/auto-heal/auto-heal-engine.ts`  
**Engine C:** `engines/governance/auto-remediation-engine.ts`  
**Engine D:** `core/omega/incident-response/incident-response-engine.ts`

| Field | Value |
|-------|-------|
| Nature | functional_overlap + write_conflict + ownership_dispute |
| Scope | execution / repair |
| Impact | H |
| Severity | **CRITICAL** |
| Source of Truth | `sentinel-healing-engine` (ENG-013) |
| What to Merge | B (ENG-080 auto-heal-engine) heal patterns → A; D's (ENG-005) Omega-level response → merge into A with Omega-signal input port |
| What to Keep | **C (ENG-037 auto-remediation-engine) = KEEP (registry verdict KEEP)** — governs safe self-repair within governance layer; distinct from sentinel's structural healing; not deleted |
| What to Delete | lib/auto-heal/auto-heal-engine.ts (ENG-080, FIX → after merge → remove) |
| Risk if Untouched | Three engines attempt repairs simultaneously; repair storms guaranteed; false repair risk catastrophic |
| Recommended Final State | `sentinel-healing-engine` is the single structural repair authority; ENG-037 auto-remediation governs governance-layer safe remediation; Omega feeds signals via contract port |

---

### CONFLICT-003
**Engine A:** `core/sentinel/quality-gates/sentinel-quality-gate.ts`  
**Engine B:** `lib/engines/strict-quality-gate-engine.ts`  
**Engine C:** `lib/god/quality-gate-engine.ts`

| Field | Value |
|-------|-------|
| Nature | functional_overlap + parallel_ungoverned |
| Scope | governance |
| Impact | H |
| Severity | **CRITICAL** |
| Source of Truth | `sentinel-quality-gate` (ENG-261) |
| What to Merge | B's (ENG-148) strict threshold logic → A (as configurable parameters); C deleted outright |
| What to Keep | **B (ENG-148 strict-quality-gate-engine) = KEEP (registry verdict KEEP)** — strict thresholds become configurable parameters inside ENG-148; engine file is NOT deleted; it becomes the configurable threshold layer that feeds sentinel-quality-gate |
| What to Delete | lib/god/quality-gate-engine.ts (ENG-157 = REMOVE; already queued SAFE-REMOVE) |
| Risk if Untouched | Quality gate decisions made by three engines; a passing entity in A may be blocked by B and allowed by C; publish decisions are inconsistent |
| Recommended Final State | ENG-261 sentinel-quality-gate = single authority; ENG-148 strict-quality-gate becomes configurable parameter store feeding ENG-261; lib/god/quality-gate-engine.ts removed |

---

### CONFLICT-004
**Engine A (CANONICAL/KEEP):** `lib/data-quality/engines/quarantine-engine.ts` (ENG-097)
**Engine B (FIX):** `services/quarantine/quarantine-engine.ts` (ENG-259)

| Field | Value |
|-------|-------|
| Nature | write_conflict + ownership_dispute |
| Scope | data |
| Impact | H |
| Severity | **CRITICAL** |
| Source of Truth | `lib/data-quality/engines/quarantine-engine.ts` (ENG-097) — registry verdict: KEEP |
| What to Fix | ENG-259 (services/quarantine) must adopt the same quarantine_queue schema as ENG-097; unify schema; add DQ-specific trigger patterns to ENG-259 as plugins |
| What to Delete | None — both engines serve distinct purposes; fix schema alignment |
| Risk if Untouched | Both write to quarantine_queue with different schemas; entities quarantined by A may be ignored by B's unquarantine logic; entities stay quarantined forever or are wrongly freed |
| Recommended Final State | Unified quarantine_queue schema; ENG-097 handles DQ-triggered quarantines; ENG-259 handles service-layer quarantines; no schema mismatch |

---

### CONFLICT-005
**Engine A (CANONICAL/KEEP):** `lib/engines/auto-publish-engine.ts` (ENG-107)
**Engine B (MERGE):** `engines/lifecycle/auto-publish-orch-engine.ts` (ENG-050)

| Field | Value |
|-------|-------|
| Nature | write_conflict + parallel_ungoverned |
| Scope | data |
| Impact | H |
| Severity | **CRITICAL** |
| Source of Truth | `lib/engines/auto-publish-engine.ts` (ENG-107) — registry verdict: KEEP |
| What to Merge | ENG-050 orch wiring absorbed into ENG-107; no unique business logic in orch variant |
| What to Delete | `engines/lifecycle/auto-publish-orch-engine.ts` (after merge verified) |
| Risk if Untouched | Both can write `status='published'` on seed_merchants; double-publish events, duplicate notifications, inconsistent timestamps |
| Recommended Final State | Only `lib/engines/auto-publish-engine.ts` (ENG-107) triggers publish writes; orch variant removed |

---

### CONFLICT-006
**Engine A (CANONICAL/KEEP):** `lib/engines/auto-unpublish-engine.ts` (ENG-108)
**Engine B (MERGE):** `engines/lifecycle/auto-unpublish-orch-engine.ts` (ENG-051)

| Field | Value |
|-------|-------|
| Nature | write_conflict + parallel_ungoverned |
| Scope | data |
| Impact | H |
| Severity | **CRITICAL** |
| Source of Truth | `lib/engines/auto-unpublish-engine.ts` (ENG-108) — registry verdict: KEEP |
| What to Merge | ENG-051 orch wiring absorbed into ENG-108; no unique business logic in orch variant |
| What to Delete | `engines/lifecycle/auto-unpublish-orch-engine.ts` (after merge verified) |
| Risk if Untouched | A publishes, B unpublishes the same entity in the same interval cycle; flapping publish state |
| Recommended Final State | Only `lib/engines/auto-unpublish-engine.ts` (ENG-108) triggers unpublish writes; orch variant removed |

---

### CONFLICT-007
**Engine A:** `core/omega/memory/memory-engine.ts`  
**Engine B:** `engines/core/engine-memory.ts`

| Field | Value |
|-------|-------|
| Nature | ownership_dispute + parallel_ungoverned |
| Scope | memory |
| Impact | M |
| Severity | **CRITICAL** |
| Source of Truth | `engines/core/engine-memory.ts` (operational); `omega-memory` (strategic) |
| What to Merge | Define clear separation: A = strategic learning (Omega decisions), B = operational fix history (BaseEngine auto-fixes); document boundary; forbid cross-reads without adapter |
| Risk if Untouched | Auto-fix history read by Omega as strategic decisions; false learning; repair decisions based on corrupted signal |
| Recommended Final State | Explicit boundary: B owns issue_signatures and auto-apply_fixes; A owns Omega decision history; never shared |

---

### CONFLICT-008
**Engine A:** `lib/data-quality/engines/taxonomy-integrity-engine.ts`  
**Engine B:** `engines/taxonomy/adaptive-taxonomy-orch-engine.ts`  
**Engine C:** `engines/governance/taxonomy-governance-engine.ts`  
**Engine D:** `lib/god/taxonomy-god-engine.ts`

| Field | Value |
|-------|-------|
| Nature | write_conflict + ownership_dispute |
| Scope | data / taxonomy |
| Impact | H |
| Severity | **CRITICAL** |
| Source of Truth | `engines/governance/taxonomy-governance-engine.ts` (governance) + `lib/data-quality/engines/taxonomy-integrity-engine.ts` (DQ sweep) |
| What to Merge | A handles sweep detection → keep; B handles adaptation → keep; C handles enforcement → keep (separate concerns); D (god-level mutations) → quarantine immediately |
| What to Delete | `lib/god/taxonomy-god-engine.ts` |
| Risk if Untouched | D performs god-level taxonomy mutations bypassing A/B/C governance; entities are reclassified without audit trail; silent taxonomy corruption |
| Recommended Final State | 3-layer model: integrity sweep (A) → adaptation (B) → governance enforcement (C); D permanently removed |

---

### CONFLICT-009
**Engine A:** `engines/normalizers/menu-rebuild-orch-engine.ts`  
**Engine B:** `lib/engines/menu-rebuild-engine.ts`  
**Engine C:** `lib/engines/menu-intelligence-engine.ts`  
**Engine D:** `engines/normalizers/food-menu-normalizer-orch-engine.ts` (ENG-052, MERGE — absorbed into ENG-120)

| Field | Value |
|-------|-------|
| Nature | functional_overlap + write_conflict |
| Scope | data |
| Impact | H |
| Severity | **CRITICAL** |
| Source of Truth | `lib/engines/food-menu-normalizer-engine.ts` (ENG-120, registry KEEP — canonical menu pipeline) |
| What to Merge | menu-rebuild logic → pipeline stage in ENG-120; menu-intelligence insights → input stage in ENG-120; ENG-052 orch logic → absorbed into ENG-120 |
| What to Delete | menu-rebuild-orch-engine (after merge), lib/engines/menu-rebuild-engine (after merge), food-menu-normalizer-orch-engine (ENG-052, after merge into ENG-120) |
| Risk if Untouched | All four write to menu_items simultaneously; menu data corrupted by conflicting normalization passes; items lose custom fields |
| Recommended Final State | Single pipeline in `lib/engines/food-menu-normalizer-engine.ts` (ENG-120): `[normalize → intelligence → rebuild → gate]`; ENG-052 orch logic absorbed; ENG-120 is the single canonical menu normalizer |

---

### CONFLICT-010
**Engine A:** `lib/data-quality/engines/duplicate-shadow-engine.ts`  
**Engine B:** `lib/dedup/dedup-engine.ts`  
**Engine C:** `lib/engines/franchise-dedup-engine.ts`  
**Engine D:** `lib/import-engine/dedup/dedup-engine.ts`

| Field | Value |
|-------|-------|
| Nature | functional_overlap + write_conflict |
| Scope | data |
| Impact | H |
| Severity | **CRITICAL** |
| Source of Truth | `lib/dedup/dedup-engine.ts` |
| What to Merge | A's detection patterns → B; C's franchise-specific rules → B (as plugin/strategy); D → B (import path) |
| What to Delete | A, C, D (after merge) |
| Risk if Untouched | Same entity marked as duplicate by A, not by B; franchise entities incorrectly deduped by C using wrong logic; import entities bypass canonical dedup |
| Recommended Final State | Single dedup authority: `lib/dedup/dedup-engine.ts` with pluggable strategies |

---

### CONFLICT-011
**Engine A:** `lib/data-quality/engines/media-relevance-engine.ts` (ENG-096, registry KEEP — canonical media relevance scorer)  
**Engine B:** `engines/governance/media-relevance-engine.ts` (ENG-042, MERGE — governance shadow, absorbed into ENG-096)  
**Engine C:** `services/media-truth/media-truth-engine.ts` (ENG-258, KEEP — separate scope: media authenticity, not relevance)

| Field | Value |
|-------|-------|
| Nature | functional_overlap + ownership_dispute |
| Scope | data |
| Impact | M |
| Severity | **CRITICAL** |
| Source of Truth | `lib/data-quality/engines/media-relevance-engine.ts` (ENG-096, registry KEEP — canonical media relevance authority; ENG-258 covers authenticity, a distinct concern) |
| What to Merge | ENG-042 (B) governance validation patterns → ENG-096 (A) |
| What to Delete | engines/governance/media-relevance-engine.ts (ENG-042, after merge into ENG-096); ENG-258 is NOT deleted — it handles media authenticity, a separate scope from relevance scoring |
| Risk if Untouched | A and B both write relevance scores for the same media; contradictory relevance verdicts corrupt entity publish decisions |
| Recommended Final State | `lib/data-quality/engines/media-relevance-engine.ts` (ENG-096) is the single media relevance authority; ENG-042 absorbed; ENG-258 retained as media authenticity engine (non-overlapping scope) |

---

### CONFLICT-012
**Engine A:** `lib/engines/engine-metadata-registry.ts`  
**Engine B:** `core/sentinel/registry/engine-registry.ts`  
**Engine C:** `lib/data-quality/engine-registry.ts`  
**Engine D:** `engines/engine-registry.ts`  
**Engine E:** `lib/engines/real-estate-engine-registry.ts`

| Field | Value |
|-------|-------|
| Nature | ownership_dispute + parallel_ungoverned |
| Scope | governance / metadata |
| Impact | H |
| Severity | **CRITICAL** |
| Source of Truth | See resolution below |
| Resolution | Federated model: A (metadata/cockpit), B (health/heartbeat), C (DQ sweep runs), D (boot registration), E (REMOVE) |
| Risk if Untouched | Five registries with inconsistent engine lists; engine present in D but not B means no health monitoring; engine in E only means no boot registration |
| Recommended Final State | 4 registries with clearly separated concerns; E merged into A; cross-registry IDs must match |

---

## HIGH CONFLICTS

---

### CONFLICT-013
**Engine A:** `lib/god/continuous-audit-engine.ts`  
**Engine B:** `core/sentinel/audit/sentinel-audit-engine.ts`  
**Engine C:** `lib/audit/master-audit-engine.ts`

| Field | Value |
|-------|-------|
| Nature | functional_overlap + parallel_ungoverned |
| Scope | governance |
| Impact | H |
| Severity | HIGH |
| Source of Truth | `sentinel-audit-engine` |
| What to Delete | continuous-audit-engine.ts, master-audit-engine.ts |
| Risk if Untouched | Audit findings from 3 sources with different severity mappings; same issue logged differently; incident de-escalation blocked because one audit still shows it open |
| Recommended Final State | `sentinel-audit-engine` is the sole audit authority; A and C removed; all audit findings route through sentinel-incident-engine |

---

### CONFLICT-014
**Engine A:** `lib/god/observability-engine.ts`  
**Engine B:** `lib/monitoring/unified-monitor.ts`  
**Engine C:** `core/sentinel/telemetry/sentinel-telemetry-engine.ts`

| Field | Value |
|-------|-------|
| Nature | functional_overlap |
| Scope | monitoring |
| Impact | M |
| Severity | HIGH |
| Source of Truth | `unified-monitor` (runtime) + `sentinel-telemetry` (governance) |
| What to Delete | god/observability-engine.ts |
| Risk if Untouched | Triple telemetry emission; Sentry duplicate events; 3x log volume without 3x insight |
| Recommended Final State | A removed; B handles runtime monitoring; C handles governance telemetry; no overlap in emission targets |

---

### CONFLICT-015
**Engine A:** `core/omega/self-improvement/self-improvement-engine.ts`  
**Engine B:** `core/omega/code-evolution/code-evolution-engine.ts`

| Field | Value |
|-------|-------|
| Nature | functional_overlap + circular_dependency_risk |
| Scope | execution |
| Impact | H |
| Severity | HIGH |
| Source of Truth | Neither — both should be quarantined |
| Risk if Untouched | A proposes improvements that B evolves into code proposals; B's proposals feed back into A as improvement signals; infinite loop of unvalidated proposals |
| Recommended Final State | Both A and B quarantined; any future self-improvement mechanism must be rebuilt under Omega governance with human-review gates and bounded scope |

---

### CONFLICT-016
**Engine A:** `lib/engines/digital-orchestration-engine.ts`  
**Engine B:** `lib/engines/unified-global-engine.ts`

| Field | Value |
|-------|-------|
| Nature | functional_overlap |
| Scope | ui / execution |
| Impact | H |
| Severity | HIGH |
| Source of Truth | Neither — both have excessive scope |
| Resolution | Split both into 4 focused engines: UX-Quality, Content-Strategy, Conversion-Optimization, Country-Intelligence |
| Risk if Untouched | Two mega-engines controlling homepage compete for render state; UI races guaranteed |
| Recommended Final State | Both A and B decomposed; 4 focused replacement engines with single responsibilities; render state ownership assigned per engine |

---

### CONFLICT-017
**Engine A:** `lib/runtime/listing-quality-engine.ts`  
**Engine B:** `lib/engines/shop-quality-engine.ts`  
**Engine C:** `lib/data-quality/engines/data-quality-scoring-engine.ts`

| Field | Value |
|-------|-------|
| Nature | write_conflict + ownership_dispute |
| Scope | data |
| Impact | M |
| Severity | HIGH |
| Source of Truth | `lib/engines/shop-quality-engine.ts` |
| Risk if Untouched | Three engines write quality scores to seed_merchants; last-writer wins; score inconsistency between page render and dashboard |
| Recommended Final State | Field-level ownership: A owns listing_quality_score; B owns shop_quality_score; C owns dq_score; no cross-writes; see CONFLICT-045 for multi-engine write-lock resolution |

---

### CONFLICT-018
**Engine A:** `lib/trust-engine/ranking-engine.ts`  
**Engine B:** `lib/ranking-engine.ts`  
**Engine C:** `lib/ranking/central-ranking-engine.ts`

| Field | Value |
|-------|-------|
| Nature | functional_overlap |
| Scope | data |
| Impact | M |
| Severity | HIGH |
| Source of Truth | `lib/ranking/central-ranking-engine.ts` |
| What to Merge | A's trust-weighted rank adjustments → C (as plugin); B → C |
| What to Delete | A (after merge), B (after merge) |
| Risk if Untouched | Three ranking scores coexist; discovery page uses one, search uses another, trust layer uses third |
| Recommended Final State | `central-ranking-engine` (C) is the single ranking authority; A's trust-weighting absorbed as plugin; B removed; single consistent rank score served to all consumers |

---

### CONFLICT-019
**Engine A:** `core/omega/prediction/prediction-engine.ts`  
**Engine B:** `lib/radar/predictive-demand-engine.ts`

| Field | Value |
|-------|-------|
| Nature | functional_overlap |
| Scope | execution |
| Impact | M |
| Severity | HIGH |
| Source of Truth | `lib/radar/predictive-demand-engine.ts` (domain-specific) |
| Resolution | A to consume B's predictions via signal; A should not recompute independently |
| Risk if Untouched | Two demand predictions; Omega makes decisions on its own prediction while Radar shows different values to users |
| Recommended Final State | B is the domain demand prediction authority; A consumes B's output as a signal input; A does not compute demand independently; single demand prediction value across platform |

---

### CONFLICT-020
**Engine A:** `lib/engines/notification-engine.ts`  
**Engine B:** `lib/shared/notification-engine.ts`

| Field | Value |
|-------|-------|
| Nature | functional_overlap + write_conflict |
| Scope | data |
| Impact | M |
| Severity | HIGH |
| Source of Truth | `lib/shared/notification-engine.ts` |
| What to Delete | `lib/engines/notification-engine.ts` |
| Risk if Untouched | Double notifications sent to users; notification dedup logic is per-engine, not shared |
| Recommended Final State | `lib/shared/notification-engine.ts` is the sole notification authority; A removed; all notification callers updated to import from shared |

---

### CONFLICT-021
**Engine A:** `lib/engines/seo-engine.ts`  
**Engine B:** `lib/seo/seo-engine.ts`

| Field | Value |
|-------|-------|
| Nature | functional_overlap |
| Scope | data |
| Impact | M |
| Severity | HIGH |
| Source of Truth | `lib/seo/seo-engine.ts` |
| What to Delete | `lib/engines/seo-engine.ts` |
| Risk if Untouched | Two SEO metadata writers; inconsistent meta tags for the same page |
| Recommended Final State | `lib/seo/seo-engine.ts` is the sole SEO authority; A removed; consistent meta tags served from single source |

---

### CONFLICT-022
**Engine A:** `lib/god/maintenance-engine.ts`  
**Engine B:** `core/sentinel/healing/sentinel-healing-engine.ts`

| Field | Value |
|-------|-------|
| Nature | parallel_ungoverned + ownership_dispute |
| Scope | execution |
| Impact | H |
| Severity | HIGH |
| Source of Truth | `sentinel-healing-engine` |
| What to Delete | `lib/god/maintenance-engine.ts` |
| Risk if Untouched | God-layer maintenance bypasses sentinel governance; healing actions leave no audit trail |
| Recommended Final State | `sentinel-healing-engine` is the sole maintenance/heal authority; A removed; all maintenance actions produce sentinel audit trails |

---

### CONFLICT-023
**Engine A:** `lib/data-quality/engines/duplicate-shadow-engine.ts`  
**Engine B:** `lib/dedup/dedup-engine.ts`

*(Cross-reference CONFLICT-010 — most critical dedup conflict; this entry covers the DQ-pipeline-specific aspect)*

| Field | Value |
|-------|-------|
| Nature | functional_overlap |
| Scope | data |
| Impact | M |
| Severity | HIGH |
| Source of Truth | `lib/dedup/dedup-engine.ts` (B) — canonical dedup authority per CONFLICT-010 |
| What to Do | A's shadow detection findings must feed as deduplicated signal inputs into B; A must not write dedup decisions independently; route A's signals to B via the dedup event queue |
| Risk if Untouched | DQ pipeline identifies duplicates independently of canonical dedup; different dedup rules produce different results; entities de-duplicated by one engine but not the other |
| Recommended Final State | A = detection-only; B = decision and write authority; A feeds B; see CONFLICT-010 for full resolution plan |

---

### CONFLICT-024
**Engine A:** `engines/governance/layout-integrity-engine.ts`  
**Engine B:** `lib/engines/ux-audit-engine.ts`  
**Engine C:** `lib/ui-engine/canonical-ui-engine.ts`

| Field | Value |
|-------|-------|
| Nature | functional_overlap |
| Scope | ui |
| Impact | M |
| Severity | HIGH |
| Source of Truth | `lib/engines/ux-audit-engine.ts` (audit) + `lib/ui-engine/canonical-ui-engine.ts` (enforcement) |
| What to Merge | A's layout findings → B; C is the enforcer, not the detector |
| What to Delete | `engines/governance/layout-integrity-engine.ts` |
| Risk if Untouched | Layout issues flagged 3× with 3 different severities; no single fix path |
| Recommended Final State | A removed; B is sole layout audit authority (detects); C is sole UI enforcement authority (enforces); B's findings trigger C's enforcement pass |

---

### CONFLICT-025
**Engine A:** `lib/engines/digital-orchestration-engine.ts`  
**Engine B:** `engines/governance/banner-strategy-engine.ts`  
**Engine C:** `lib/context-banner/context-banner-engine.ts`

| Field | Value |
|-------|-------|
| Nature | write_conflict |
| Scope | ui |
| Impact | M |
| Severity | HIGH |
| Source of Truth | `lib/context-banner/context-banner-engine.ts` |
| What to Delete | `engines/governance/banner-strategy-engine.ts` |
| Risk if Untouched | Banner set by A, overridden by B, overridden again by C; users see flashing/inconsistent banners |
| Recommended Final State | C is the sole banner authority; B removed; A's banner-triggering logic routes through C's API only; no independent banner writes |

---

## MEDIUM CONFLICTS

---

### CONFLICT-026 — Workflow Engine Duplication
**Engine A:** `core/sentinel/workflows/sentinel-workflow-engine.ts`  
**Engine B:** `lib/workflows/workflow-engine.ts`

| Field | Value |
|-------|-------|
| Nature | functional_overlap |
| Scope | execution / governance |
| Impact | M |
| Severity | MEDIUM |
| Source of Truth | `sentinel-workflow-engine` (A) for governance workflows; `lib/workflows/workflow-engine` (B) for domain workflows |
| What to Do | Document scope boundary explicitly in both files; A handles governance lifecycle (audit, healing, escalation); B handles domain-specific workflows (publish, onboarding, content); no cross-writes |
| Risk if Untouched | Governance workflows silently routed to domain handler; audit events lost; sentinel escalations miss triggers |
| Recommended Final State | Both engines retained with documented contract: A = governance scope, B = domain scope; boundary enforced via import policy |

---

### CONFLICT-027 — Priority Engine Duplication
**Engine A:** `core/omega/priority/priority-engine.ts`  
**Engine B:** `lib/admin/priority-engine.ts`

| Field | Value |
|-------|-------|
| Nature | ownership_dispute |
| Scope | execution |
| Impact | M |
| Severity | MEDIUM |
| Source of Truth | `core/omega/priority/priority-engine.ts` (A) — Omega-level canonical priority |
| What to Do | Rename B to `lib/admin/sla-priority-engine.ts`; clarify A is platform-wide Omega priority, B is SLA/admin-tier priority; forbid B from writing to A's priority store |
| Risk if Untouched | Admin-level priority writes overwrite Omega priority decisions; SLA escalations corrupt platform-wide queue ordering |
| Recommended Final State | A = platform Omega priority (untouched); B renamed and scoped to SLA priority decisions only |

---

### CONFLICT-028 — Proof Log Duplication
**Engine A:** `engines/core/proof-system.ts`  
**Engine B:** `lib/trust-engine/proof-log-engine.ts`

| Field | Value |
|-------|-------|
| Nature | functional_overlap |
| Scope | governance / data |
| Impact | M |
| Severity | MEDIUM |
| Source of Truth | A = repair/action proof authority; B = trust verification proof authority |
| What to Do | Document separation in both files: A records proof of repair actions (auto-heal, remediation); B records proof of trust decisions (trust score changes, user trust events); prohibit cross-reads |
| Risk if Untouched | Trust audits pull repair proofs; repair audits pull trust proofs; misleading audit trails produced |
| Recommended Final State | Both retained; scope enforced via code comment contracts and import guards |

---

### CONFLICT-029 — Cron Orchestrator Duplication
**Engine A:** `core/sentinel/scheduling/sentinel-cron-orchestrator.ts`  
**Engine B:** `lib/god/cron-orchestrator.ts`

| Field | Value |
|-------|-------|
| Nature | parallel_ungoverned |
| Scope | execution / governance |
| Impact | M |
| Severity | MEDIUM |
| Source of Truth | `sentinel-cron-orchestrator` (A) — canonical cron authority |
| What to Delete | `lib/god/cron-orchestrator.ts` (B) |
| Risk if Untouched | God-layer cron bypasses sentinel scheduling; jobs fire twice or at wrong intervals; no audit trail for god-layer cron triggers |
| Recommended Final State | B removed; all cron scheduling routes through sentinel-cron-orchestrator |

---

### CONFLICT-030 — Search Purity vs Search Hygiene
**Engine A:** `lib/runtime/search-purity-engine.ts`  
**Engine B:** `lib/data-quality/engines/search-hygiene-engine.ts`

| Field | Value |
|-------|-------|
| Nature | functional_overlap |
| Scope | data / execution |
| Impact | M |
| Severity | MEDIUM |
| Source of Truth | A = runtime search filter authority; B = batch hygiene authority |
| What to Do | Clarify scope in code docs: A filters realtime search results (runtime); B batch-cleans search index data (DQ pipeline); A must never call B synchronously |
| Risk if Untouched | Search results filtered twice with conflicting rules; batch hygiene writes corrupt runtime filter state |
| Recommended Final State | Both retained with documented timing separation; A = synchronous runtime path, B = async batch path |

---

### CONFLICT-031 — Trust Score vs User Trust
**Engine A:** `lib/trust-engine/trust-score-engine.ts`  
**Engine B:** `lib/trust/user-trust-engine.ts`

| Field | Value |
|-------|-------|
| Nature | ownership_dispute |
| Scope | data |
| Impact | M |
| Severity | MEDIUM |
| Source of Truth | A = entity-level trust authority; B = user-level trust authority |
| What to Do | Rename B to `user-trust-score-engine.ts`; add explicit scope comment to both files; forbid A reading from B's store and vice versa; define separate output tables (entity_trust vs user_trust) |
| Risk if Untouched | Entity trust scores polluted by user trust signals; user trust ratings overwritten by entity quality scores; metrics meaningless |
| Recommended Final State | A writes only to entity_trust; B writes only to user_trust; both renamed for clarity |

---

### CONFLICT-032 — Auto-Heal vs Auto-Repair
**Engine A:** `lib/auto-heal/auto-heal-engine.ts`  
**Engine B:** `lib/runtime/auto-repair-engine.ts`

| Field | Value |
|-------|-------|
| Nature | functional_overlap |
| Scope | execution / repair |
| Impact | M |
| Severity | MEDIUM |
| Source of Truth | `sentinel-healing-engine` is ultimate authority; A and B are subordinate repair engines with distinct timing |
| What to Do | Clarify: A = deep structural heal (schema, relationship repair — slow); B = runtime state repair (cache, realtime channels — fast); A should call B for realtime-layer fixes before initiating structural heal; A eventually merges into sentinel-healing |
| Risk if Untouched | A and B fire concurrently on same entity; structural repair overwrites runtime fix; repair loop possible |
| Recommended Final State | A calls B for runtime-layer fixes; A's structural logic absorbed into sentinel-healing-engine post-migration |

---

### CONFLICT-033 — Entity Recovery vs Safe Remediation
**Engine A:** `lib/engines/entity-recovery-engine.ts`  
**Engine B:** `lib/data-quality/engines/safe-remediation-engine.ts`

| Field | Value |
|-------|-------|
| Nature | ownership_dispute |
| Scope | execution / data |
| Impact | M |
| Severity | MEDIUM |
| Source of Truth | No conflict — scopes are distinct; both are canonical in their domain |
| What to Do | Add explicit domain comments to both: A = entity visibility-mode recovery (unpublish → quarantine → republish lifecycle); B = field-level data correction (fix bad field values, normalize data); no functional overlap confirmed |
| Risk if Untouched | Developers treat them as interchangeable; wrong engine called for wrong recovery type; entity republished with uncorrected field data |
| Recommended Final State | Both retained; domain boundary documented; A and B may be called sequentially (B cleans fields, A restores visibility) |

---

### CONFLICT-034 — Import Dedup vs Lib Dedup
**Engine A:** `lib/import-engine/dedup/dedup-engine.ts`  
**Engine B:** `lib/dedup/dedup-engine.ts`

| Field | Value |
|-------|-------|
| Nature | functional_overlap |
| Scope | data |
| Impact | M |
| Severity | MEDIUM |
| Source of Truth | `lib/dedup/dedup-engine.ts` (B) — canonical dedup authority |
| What to Do | Merge A's import-pipeline-specific logic into B as an import-context adapter; A becomes a thin wrapper or is deleted post-merge |
| Risk if Untouched | Import pipeline uses different dedup rules than rest of platform; import-sourced entities bypass canonical dedup; duplicates enter via import path undetected |
| Recommended Final State | B absorbs import-specific dedup logic; A removed after migration |

---

### CONFLICT-035 — Omega Decision vs AI Decision Engine
**Engine A:** `core/omega/decision/decision-engine.ts`  
**Engine B:** `lib/engines/ai-decision-engine.ts`

| Field | Value |
|-------|-------|
| Nature | parallel_ungoverned |
| Scope | governance / execution |
| Impact | M |
| Severity | MEDIUM |
| Source of Truth | `core/omega/decision/decision-engine.ts` (A) — canonical Omega decision authority |
| What to Do | Quarantine B immediately; B has "AI" branding but contains no model, no proof system, and no governance chain; it is an ungoverned shadow of A |
| Risk if Untouched | Platform decisions routed to B bypass Omega governance; decisions made without audit trail; AI branding misleads developers into trusting B's output |
| Recommended Final State | B quarantined; all decision calls route through A; if AI enrichment is needed, it must be added to A with proper proof chain |

---

### CONFLICT-036 — Context-Awareness vs Session Intelligence
**Engine A:** `lib/engines/personal-radar/context-awareness-engine.ts`  
**Engine B:** `lib/engines/personal-radar/session-intelligence-engine.ts`

| Field | Value |
|-------|-------|
| Nature | functional_overlap |
| Scope | data / memory |
| Impact | M |
| Severity | MEDIUM |
| Source of Truth | Both are valid; A = cross-session environment authority, B = within-session signal authority |
| What to Do | Add explicit scope contracts to both: B writes session-scoped keys (session_signals, current_session_context); A writes environment keys (user_environment, cross_session_profile); enforce no key overlap via schema constraints |
| Risk if Untouched | A and B write to same radar keys; session signals overwrite environment context; personalization degrades every time a new session starts |
| Recommended Final State | Both retained; distinct key namespaces enforced; A reads from B to enrich cross-session model |

---

### CONFLICT-037 — Provider Quality vs Shop Quality
**Engine A:** `lib/runtime/provider-quality-engine.ts`  
**Engine B:** `lib/engines/shop-quality-engine.ts`

| Field | Value |
|-------|-------|
| Nature | ownership_dispute |
| Scope | data |
| Impact | M |
| Severity | MEDIUM |
| Source of Truth | A = service provider quality authority; B = storefront/shop quality authority |
| What to Do | Verify neither writes to the same database columns; A owns provider_quality_score; B owns shop_quality_score; document separate output tables in code |
| Risk if Untouched | Provider quality score overwrites shop quality score for provider-owned shops; shop rankings distorted by service performance metrics |
| Recommended Final State | Both retained with verified separate output schemas; no shared table writes confirmed |

---

### CONFLICT-038 — Dedup (lib) vs Duplicate Shadow (DQ)
*(Cross-reference CONFLICT-010 — most critical dedup conflict; resolution governed there)*

**Engine A:** `lib/dedup/dedup-engine.ts`  
**Engine B:** `lib/data-quality/engines/duplicate-shadow-engine.ts`

| Field | Value |
|-------|-------|
| Nature | functional_overlap |
| Scope | data |
| Impact | M |
| Severity | MEDIUM |
| Source of Truth | See CONFLICT-010 — `lib/dedup/dedup-engine.ts` is canonical dedup authority |
| What to Do | See CONFLICT-010 resolution; B's shadow detection findings must feed as inputs into A, not act independently |
| Risk if Untouched | See CONFLICT-010 |
| Recommended Final State | See CONFLICT-010 |

---

### CONFLICT-039 — Engine Connector Hub vs Engine Orchestrator
**Engine A:** `lib/system/engineConnectorHub.ts`  
**Engine B:** `engines/core/engine-orchestrator.ts`

| Field | Value |
|-------|-------|
| Nature | ownership_dispute |
| Scope | execution / governance |
| Impact | M |
| Severity | MEDIUM |
| Source of Truth | `engines/core/engine-orchestrator.ts` (B) — canonical engine boot and orchestration authority |
| What to Do | Migrate A's connection registrations into B; deprecate A; all new engine connections must register via B; add deprecation notice to A's file header |
| Risk if Untouched | Two engine connection registries diverge; engines registered in A are invisible to B's health checks; B cannot govern A's registered engines |
| Recommended Final State | B is sole engine orchestration authority; A deprecated and removed after all callers migrated |

---

### CONFLICT-040 — Content Governance vs Live Surface Sanitizer
**Engine A:** `lib/runtime/content-governance-engine.ts`  
**Engine B:** `lib/data-quality/engines/live-surface-sanitizer-engine.ts`

| Field | Value |
|-------|-------|
| Nature | functional_overlap |
| Scope | data / governance |
| Impact | M |
| Severity | MEDIUM |
| Source of Truth | A = ongoing governance rule enforcement authority; B = pre-publish sanitization authority |
| What to Do | Document timing boundary: B fires pre-publish (synchronous gate); A fires post-publish on a continuous governance cycle (async); B must not call A inline; A reads B's sanitization log for audit context |
| Risk if Untouched | Governance rules applied twice at conflicting times; content blocked at publish by A's continuous rules even after B has already cleared it |
| Recommended Final State | B = pre-publish gate; A = ongoing runtime governance; timing separation documented and enforced |

---

### CONFLICT-041 — Mapping Engine vs Category Mapping Engine
**Engine A:** `services/canonical/mapping-engine.ts`  
**Engine B:** `lib/engines/category-mapping-engine.ts`

| Field | Value |
|-------|-------|
| Nature | ownership_dispute |
| Scope | data / taxonomy |
| Impact | M |
| Severity | MEDIUM |
| Source of Truth | A = canonical field/table mapping authority; B = category taxonomy mapping authority |
| What to Do | Rename A to `canonical-field-mapping-engine.ts`; document: A maps fields and tables to canonical schema; B maps entity categories to taxonomy tree; no shared output fields |
| Risk if Untouched | Developers call wrong engine for mapping needs; category mappings applied as field mappings, corrupting canonical schema |
| Recommended Final State | A renamed for clarity; both retained with distinct documented mapping domains |

---

### CONFLICT-042 — Onboarding Publish Gate vs Vertical Publish Gates
**Engine A:** `lib/onboarding/publish-gate.engine.ts`  
**Engine B:** `lib/engines/publish-gate-food-engine.ts`  
**Engine C:** `lib/engines/publish-gate-grocery-engine.ts`  
**Engine D:** `lib/engines/publish-gate-service-engine.ts`

| Field | Value |
|-------|-------|
| Nature | ownership_dispute |
| Scope | governance / execution |
| Impact | M |
| Severity | MEDIUM |
| Source of Truth | A = generic gate policy authority; B/C/D = vertical-specific specializations |
| What to Do | A should read entity type and delegate to appropriate B/C/D based on vertical; B/C/D must not apply gate decisions independently without A's coordination; refactor A as the dispatch coordinator |
| Risk if Untouched | Onboarding entities bypass vertical publish gates; vertical entities bypass onboarding gate; inconsistent publish criteria across entity types |
| Recommended Final State | A dispatches to B/C/D based on entity type; single publish gate entry point for all verticals |

---

### CONFLICT-043 — Global Context Engine vs Unified Global Engine
**Engine A:** `lib/context/global-context-engine.ts`  
**Engine B:** `lib/engines/unified-global-engine.ts`

| Field | Value |
|-------|-------|
| Nature | functional_overlap |
| Scope | data / ui |
| Impact | M |
| Severity | MEDIUM |
| Source of Truth | A = runtime context state authority; B = UX quality and content logic authority |
| What to Do | Rename both for clarity; B's context reads must use A's published API (not read context tables directly); document: A owns global_context store, B owns ux_quality_context store |
| Risk if Untouched | B reads stale context by bypassing A's API; UX quality decisions made on outdated global state |
| Recommended Final State | A is the context state authority; B reads only via A's API; both renamed for unambiguous scope |

---

### CONFLICT-044 — Platform Recovery vs Auto Repair
**Engine A:** `lib/platform/platform-recovery-engine.ts`  
**Engine B:** `lib/runtime/auto-repair-engine.ts`

| Field | Value |
|-------|-------|
| Nature | functional_overlap |
| Scope | execution / repair |
| Impact | M |
| Severity | MEDIUM |
| Source of Truth | A = platform infrastructure recovery authority; B = runtime state repair authority |
| What to Do | Clarify: A = platform-level restart (Supabase reconnect, service reinit, cold-start recovery); B = runtime-level repair (cache invalidation, realtime channel restore); B should call A when a platform-level restart is the required fix |
| Risk if Untouched | B attempts runtime repair on platform-level failures; partial repairs leave system in degraded state; platform restarts miss runtime cleanup |
| Recommended Final State | B calls A when platform restart is required; A handles infrastructure layer; B handles runtime layer |

---

### CONFLICT-045 — Multiple Scoring Engines Writing to seed_merchants
**Engines:** `lib/engines/shop-quality-engine.ts`, `lib/data-quality/engines/dq-scoring-engine.ts`, `lib/engines/listing-quality-engine.ts`, `lib/data-quality/engines/data-trust-engine.ts`, `core/sentinel/scoring/sentinel-scoring-engine.ts`

| Field | Value |
|-------|-------|
| Nature | write_conflict |
| Scope | data |
| Impact | M |
| Severity | MEDIUM |
| Source of Truth | Field-level ownership per engine (no single engine owns the whole table) |
| What to Do | Define explicit field ownership in `engine-metadata-registry`: each score column owned by exactly one engine; add write guards that reject writes to fields not owned by the calling engine |
| Risk if Untouched | Multiple engines overwrite each other's scores; merchant quality metrics are non-deterministic; leaderboard rankings unstable |
| Recommended Final State | Field-level ownership table published in engine-metadata-registry; no two engines may write the same seed_merchants field |

---

### CONFLICT-046 — AI Audit Engines vs Sentinel Audit Engine
**Engine A (cluster):** `lib/ai-audit/engines/*.ts` (6 engines)  
**Engine B:** `core/sentinel/audit/sentinel-audit-engine.ts`

| Field | Value |
|-------|-------|
| Nature | parallel_ungoverned + detect_without_act |
| Scope | governance / execution |
| Impact | M |
| Severity | MEDIUM |
| Source of Truth | `sentinel-audit-engine` (B) — canonical audit authority |
| What to Do | Quarantine all 6 AI audit engines (see QUARANTINE verdicts ENG-104, ENG-105, ENG-106); their findings must route through `sentinel-incident-engine` to have any effect; AI audit engines may detect but must not act |
| Risk if Untouched | 6 AI audit engines produce findings that bypass sentinel governance chain; incidents created without sentinel tracking; false positives trigger ungoverned actions |
| Recommended Final State | All AI audit engines quarantined; detection findings routed to sentinel-incident-engine; sentinel-audit-engine is sole audit authority |

---

### CONFLICT-047 — Growth Domination vs Business Opportunity
**Engine A:** `lib/growth/growth-domination-engine.ts`  
**Engine B:** `core/omega/business-opportunity/business-opportunity-engine.ts`

| Field | Value |
|-------|-------|
| Nature | functional_overlap |
| Scope | execution / governance |
| Impact | M |
| Severity | MEDIUM |
| Source of Truth | `business-opportunity-engine` (B) — canonical Omega growth authority |
| What to Do | A's growth logic (if proven to have value) must be converted to signal inputs for B, not standalone actions; A must not execute growth actions without Omega authorization; route A's signals through B |
| Risk if Untouched | A executes ungoverned growth actions (promotions, surface changes, price adjustments) without Omega oversight; growth strategies conflict with Omega business decisions |
| Recommended Final State | A converted to signal producer feeding B; B is sole growth action authority; A standalone execution capability removed |

---

## CONFLICT SUMMARY TABLE

| Severity | Count |
|----------|-------|
| CRITICAL | 12 |
| HIGH | 14 |
| MEDIUM | 21 |
| **Total** | **47** |

### Engines Involved in Most Conflicts

| Engine | Conflict Count |
|--------|---------------|
| sentinel-conflict-engine | 4 |
| sentinel-healing-engine | 5 |
| auto-repair / auto-heal cluster | 4 |
| taxonomy engine cluster | 4 |
| dedup cluster | 3 |
| quality gate cluster | 3 |
| publish lifecycle cluster | 3 |
| media relevance cluster | 3 |
| registry cluster | 5 |

---

*Document generated: 2026-04-13 | Nuclear Audit v2.0.0*
