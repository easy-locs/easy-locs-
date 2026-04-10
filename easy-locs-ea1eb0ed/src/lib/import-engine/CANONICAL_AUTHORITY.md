# Import Engine — Canonical Authority Declaration

## Status: ACTIVE — Single Source of Truth

This directory (`src/lib/import-engine/`) is the **sole canonical authority** for:

| Domain | Module | Authority Level |
|--------|--------|----------------|
| **Vertical Classification** | `classifier/vertical-classifier.ts` | SOLE |
| **Taxonomy Mapping** | `taxonomy/taxonomy-mapper.ts` | SOLE |
| **Entity Deduplication** | `dedup/dedup-engine.ts` | SOLE |
| **Field-Level Merge** | `merge/merge-engine.ts` | SOLE |
| **Source Policy** | `source-policy/source-policy.ts` | SOLE |
| **Quality Scoring** | `quality/quality-scorer.ts` | SOLE |
| **Publish Gate** | `quality/publish-gate.ts` | SOLE |
| **SEO Preparation** | `enrichment/seo-enricher.ts` | SOLE |
| **Auto-Enrichment** | `enrichment/auto-enricher.ts` | SOLE |
| **Pipeline Orchestration** | `orchestrator.ts` | SOLE |

## Legacy Facades (DO NOT ADD LOGIC)

These files delegate to this engine. They exist only for backward compatibility:

- `src/lib/import/universal-import-engine.ts` → Facade → `import-engine`
- `src/lib/import/import-pipeline-runner.ts` → Facade → `import-engine`
- `src/lib/onboarding/vertical-classifier.engine.ts` → Facade → `import-engine`
- `src/lib/onboarding/micro/publish.decider.ts` → Delegates → `import-engine`

## Edge Function Alignment

The `pipeline-worker` edge function (Deno) contains inline logic that mirrors:
- `classifyVertical()` → Aligns with `classifier/vertical-classifier.ts`
- Quality scoring → Aligns with `quality/quality-scorer.ts`
- Deduplication → Aligns with `dedup/dedup-engine.ts`

The edge function cannot import from `src/` (Deno runtime), but its logic
MUST stay aligned with the canonical engine. Any changes to scoring weights,
taxonomy mappings, or dedup thresholds MUST be mirrored in the edge function.

## Rules

1. **All new import logic** goes in this directory
2. **No consumer** may implement their own scoring, dedup, or classification
3. **No parallel paths** — every import flow must pass through `runImportEngine()`
4. **Test coverage** — every module has unit tests + E2E vertical tests
