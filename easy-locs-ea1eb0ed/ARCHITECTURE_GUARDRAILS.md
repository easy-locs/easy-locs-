# Mondikat Architecture Guardrails

## Single Source of Truth
- No duplicate systems, no v1/v2 parallel architectures
- One platform-bus, one canonical type registry, one route registry

## Domain Boundaries
- Each domain owns its screens, flows, services, state machines
- Cross-domain communication via platform-bus events or shared services
- No direct imports between domains

## Forbidden Patterns
- No direct DB access from UI components (use service layer)
- No Supabase client creation in pages
- No custom EventTarget in domains (use platform-bus)
- No massive renaming without structural gain
- No silent schema mutations

## Sensitive Zones (enhanced validation required)
- `src/domains/orbit/`
- `src/domains/wallet/`
- `src/lib/platform-bus/`
- `src/lib/trust-engine/`
- `src/lib/core/`
- `src/app/providers/`
- `src/lib/shared/`

## DevOS Rules
- DevOS reads, audits, monitors — never owns business logic
- All patches follow the Safe Patch Pipeline
- Every repair produces a proof record
- Rollback must be available for any applied patch

## AI Integration Rules
- Read before edit
- Patch surgically
- Validate before apply
- Rollback on uncertain outcome
- Never bypass services
- Never invent fake schema
- Preserve stable naming when valid
