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

## Per-Pillar Route Ownership (enforced by ESLint)
- `src/App.tsx` is a provider shell — it must contain zero `<Route>` elements
- `src/routes/index.tsx` is the aggregator — only the catch-all `<Route path="*">` and `<Route path="/seo/*">` are permitted there
- Every other route belongs in its pillar file: `src/routes/<pillar>.routes.tsx` (e.g. `dashboard.routes.tsx`, `admin.routes.tsx`, `radar.routes.tsx`)
- Pillar route files must not import other pillar route modules; cross-pillar composition happens only in `src/routes/index.tsx`
- `npm run lint` will fail with a pointer to the correct pillar file if these boundaries are broken

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
