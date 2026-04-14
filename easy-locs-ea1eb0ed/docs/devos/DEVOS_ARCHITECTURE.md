# Mondikat DevOS — Architecture

## Vision
DevOS is an internal builder system layered on top of the Mondikat super-app.
It audits, monitors, repairs, and observes the project — without owning business logic.

## Strict Separation

### Product Runtime (what users see)
- Dashboard, Radar, Orbit, Wallet, Marketplace, Me
- Onboarding, Property, Travel, Loyalty, Creator
- Support, Notifications, Admin

### DevOS Runtime (what builders use)
- Architecture Guard — validates structure, detects duplicates/violations
- AI Orchestrator — receives tasks, loads context, plans patches
- Audit Center — code/route/flow/engine audits with scoring
- Repair Center — Safe Patch Pipeline (detect→validate→apply→rollback)
- Observability — proof registry, incident log, engine health
- Project Memory — rules, incidents, fixes, canonical references
- Deploy Center — staging/production readiness, rollback controls

## Module Map

```
src/devos/
├── types.ts                    # All DevOS types
├── index.ts                    # Public API
├── builder/
│   └── architecture-guard.ts   # Route conflicts, domain boundaries, forbidden patterns
├── ai/
│   └── orchestrator.ts         # AI task processing pipeline
├── audit/
│   └── audit-engine.ts         # Route/engine/domain health audits
├── repair-center/
│   └── safe-patch-pipeline.ts  # 10-phase patch pipeline
├── observability/
│   └── proof-registry.ts       # Proofs, incidents, health dashboard
├── memory/
│   └── project-memory.ts       # Rules, domain map, incidents, proofs
├── automation/                 # Future: scheduled audits, drift detection
└── deploy/                     # Future: release guards, secrets checker
```

## Rules
1. Single source of truth — no parallel v1/v2 systems
2. No duplicate providers, stores, hooks, or canonical types
3. DevOS never owns business logic
4. All AI changes must be traceable, reviewable, and reversible
5. Sensitive zones require enhanced validation
6. Single platform-bus instance
7. No direct DB access from UI
8. Preserve domain boundaries

## Safe Patch Pipeline
1. Detect → 2. Classify → 3. Localize → 4. Plan
5. Validate preconditions → 6. Apply → 7. Verify
8. Regression check → 9. Log proof → 10. Accept/Rollback

## Routes (Protected)
- `/builder` — DevOS Dashboard
- `/builder/architecture` — Architecture Map
- `/builder/audit` — Audit Center
- `/builder/repair` — Repair Center
- `/builder/memory` — Memory Center
- `/builder/deploy` — Deploy Center
