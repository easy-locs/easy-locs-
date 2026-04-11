# ORPHAN CLEANUP REPORT

## Summary

Investigated all 57 files in `src/lib/engines/`. Classified each as KEEP (actively imported), DELETE (true orphan), or KEEP+DOCUMENT (pipeline dependency).

**Result**: 6 files deleted, 51 files retained (all actively imported).

---

## DELETED (True Orphans — Not Imported Anywhere)

| File | Reason | Action |
|------|--------|--------|
| `behavior-pattern-engine.ts` | No imports found in any source file | Deleted |
| `data-quality-engine.ts` | No imports found; quality logic exists in `quality-score-engine.ts` and backend `quality-deep-scan` | Deleted |
| `lease-generator-engine.ts` | No imports found; lease generation handled by `rent-lifecycle-cron` Edge Function | Deleted |
| `rent-payment-engine.ts` | No imports found; rent payments handled by `rent-lifecycle-cron` and `collect-sepa-rents` Edge Functions | Deleted |
| `rent-receipt-engine.ts` | No imports found; rent receipts handled by `rent-lifecycle-cron` Edge Function | Deleted |
| `taxonomy-health-engine.ts` | No imports found; taxonomy enforcement now in backend `taxonomy-enforcer` worker | Deleted |

---

## KEPT — Actively Imported by Pipeline/Admin/Components

### Used by `master-data-pipeline.ts` and/or `queue-driven-pipeline.ts`

| File | Importers | Purpose |
|------|-----------|---------|
| `adaptive-taxonomy-engine.ts` | 1 | Adaptive taxonomy classification |
| `auto-acquisition-engine.ts` | 1 | Auto-acquire merchant data |
| `autonomous-business-engine.ts` | 4 | Autonomous business operations |
| `auto-publish-engine.ts` | 2 | Pipeline auto-publish logic |
| `auto-unpublish-engine.ts` | 1 | Pipeline auto-unpublish logic |
| `category-mapping-engine.ts` | 2 | Category mapping/normalization |
| `coherence-engine.ts` | 3 | Data coherence checking |
| `data-completeness-engine.ts` | 1 | Data completeness scoring |
| `data-trust-engine.ts` | 1 | Trust computation logic |
| `entity-integrity-engine.ts` | 1 | Entity integrity validation |
| `entity-recovery-engine.ts` | 1 | Entity recovery from errors |
| `food-menu-normalizer-engine.ts` | 2 | Food menu normalization |
| `franchise-dedup-engine.ts` | 2 | Franchise deduplication |
| `grocery-normalizer-engine.ts` | 2 | Grocery catalog normalization |
| `menu-intelligence-engine.ts` | 1+ | Menu intelligence/analysis |
| `menu-presentation-engine.ts` | 1+ | Menu presentation formatting |
| `menu-rebuild-engine.ts` | 1+ | Menu reconstruction |
| `notification-engine.ts` | 1+ | Notification dispatch |
| `notification-event-dispatcher.ts` | 1+ | Event-based notifications |
| `publish-gate-food-engine.ts` | 1+ | Food publish gate |
| `publish-gate-grocery-engine.ts` | 1+ | Grocery publish gate |
| `publish-gate-service-engine.ts` | 1+ | Service publish gate |
| `service-catalog-normalizer-engine.ts` | 1+ | Service catalog normalization |
| `shop-cleanup-engine.ts` | 1+ | Shop data cleanup |
| `shop-quality-engine.ts` | 1+ | Shop quality scoring |
| `source-intake-engine.ts` | 1+ | Source data intake |
| `strict-quality-gate-engine.ts` | 1+ | Strict quality enforcement |
| `vertical-classifier-engine.ts` | 1+ | Vertical classification |
| `visibility-optimizer-engine.ts` | 1+ | Visibility optimization |

### Used by Admin Pages

| File | Importers | Purpose |
|------|-----------|---------|
| `engine-metadata-registry.ts` | 3 | Engine metadata for admin UI |
| `engine-logger.ts` | 1 | Engine logging utilities |
| `unified-global-engine.ts` | 1+ | Unified engine admin page |
| `full-stack-linkage-engine.ts` | 1 | Full-stack linkage analysis |
| `ux-audit-engine.ts` | 1+ | UX audit admin page |
| `ux-autotest-engine.ts` | 1+ | UX autotest admin page |

### Used by Components/Hooks

| File | Importers | Purpose |
|------|-----------|---------|
| `hyper-radar-engine.ts` | 2 | Radar page (types + functions) |
| `vibe-density-engine.ts` | 1+ | Radar vibe density |
| `backend-connectivity-engine.ts` | 1 | Backend status checking |
| `digital-orchestration-engine.ts` | 0 (type-only) | Orchestration types |
| `property-automation-engine.ts` | 1+ | Property automation |
| `real-estate-engine-registry.ts` | 1+ | Real estate engine registry |
| `rent-call-engine.ts` | 1+ | Rent call handling |
| `legal-engine.ts` | 1+ | Legal document generation |
| `seo-engine.ts` | 1+ | SEO management |
| `merchant-override-engine.ts` | 1+ | Merchant data overrides |
| `override-field-registry.ts` | 1+ | Override field definitions |
| `override-write-gate.ts` | 1+ | Override write protection |
| `module-health-reporter.ts` | 1+ | Module health reporting |
| `module-link-engine.ts` | 1+ | Module link checking |
| `ai-decision-engine.ts` | 1+ | AI decision support |

### Personal Radar Directory

| Path | Purpose |
|------|---------|
| `personal-radar/` | Personal radar engine directory (imported by radar components) |

---

## Overlap Analysis

| lib/engines File | src/engines Counterpart | Backend Worker | Status |
|-----------------|----------------------|----------------|--------|
| `shop-quality-engine.ts` | `quality/quality-score-engine.ts` | `quality-deep-scan` | KEPT — pipeline uses functional version; backend does DB-level scoring |
| `data-trust-engine.ts` | None | `trust-ranking-recompute` | KEPT — pipeline uses functional version; backend does full recompute |
| `auto-publish-engine.ts` | None | `auto-publish` in run-engine-cron | KEPT — pipeline orchestration uses this |
| `auto-unpublish-engine.ts` | None | `auto-unpublish` in run-engine-cron | KEPT — pipeline orchestration uses this |
| `coherence-engine.ts` | None | `coherence-sweep` in run-engine-cron | KEPT — multiple importers |
| `taxonomy-health-engine.ts` | `data/taxonomy-enforcer.ts` | `taxonomy-enforcer` | DELETED — no importers |
| `data-quality-engine.ts` | `quality/quality-score-engine.ts` | `quality-deep-scan` | DELETED — no importers |

---

## Architecture Pattern Note

The `src/lib/engines/` files follow a **functional pattern** (exported functions, not classes extending `BaseEngine`). They are consumed by the pipeline system and utility code, NOT by the engine orchestrator. This is a different execution model from the `src/engines/` class-based engines that run on `setInterval`.

Both patterns are valid:
- **Class-based** (`src/engines/`): Managed by `engineOrchestrator`, run on intervals, have lifecycle management
- **Functional** (`src/lib/engines/`): Called on-demand by pipeline stages and admin operations

No migration between patterns is needed — they serve different purposes.
