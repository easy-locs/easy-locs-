# File Organization

## Project Root (`easy-locs-ea1eb0ed/`)
```
├── src/
│   ├── domains/          # Feature domains (pillars)
│   │   ├── wallet/       # Wallet & payments
│   │   ├── property/     # Property management
│   │   ├── marketplace/  # Marketplace / concierge
│   │   ├── orbit/        # Communication (E2E encrypted)
│   │   ├── real-estate/  # Deal rooms
│   │   ├── dashboard/    # Aggregated views
│   │   ├── admin/        # Admin panel
│   │   └── ...           # Other domains
│   ├── lib/
│   │   ├── shared/       # Cross-domain shared code
│   │   │   ├── types.ts           # Central type definitions
│   │   │   ├── platform-bus.ts    # ORBIT event bus
│   │   │   ├── notification-engine.ts
│   │   │   ├── communication-pipeline.ts
│   │   │   ├── deep-link.ts
│   │   │   ├── payment-request.ts
│   │   │   └── sync-engine.ts
│   │   ├── ai-audit/     # AI audit system (15 engines)
│   │   ├── security-utils.ts
│   │   ├── orbit-x3dh.ts         # E2E encryption
│   │   ├── orbit-double-ratchet.ts
│   │   └── orbit-*.ts
│   ├── engines/          # Engine subsystems
│   ├── stores/           # Zustand state stores
│   ├── components/       # Shared UI components
│   └── hooks/            # Shared React hooks
├── supabase/
│   ├── functions/        # Edge Functions (Deno)
│   │   ├── _shared/      # Shared utilities
│   │   └── */index.ts    # Individual functions
│   └── migrations/       # SQL migrations
├── docs/                 # Architecture docs
├── .agents/rules/        # Agent context rules (this directory)
├── orchestrator/         # Multi-agent orchestrator service
├── public/               # Static assets
└── dist/                 # Build output
```

## Domain Structure Convention
Each domain follows:
```
src/domains/<domain>/
├── components/    # Domain-specific React components
├── hooks/         # Domain-specific hooks
├── stores/        # Domain Zustand stores
├── types.ts       # Domain types
├── utils.ts       # Domain utilities
└── index.ts       # Public API / barrel export
```

## Naming Conventions
- Components: `PascalCase.tsx`
- Utilities/hooks: `kebab-case.ts` or `camelCase.ts`
- Types: `PascalCase` for interfaces, `camelCase` for type aliases
- Store files: `use-<name>.ts` or `<name>-store.ts`
- Edge Functions: `kebab-case/index.ts`
- Migrations: `YYYYMMDDHHMMSS_uuid.sql`

## Import Rules
- Use `@/` path alias for absolute imports from `src/`
- Domain internal imports use relative paths
- Cross-domain imports must go through `@/lib/shared/`
- Never import from `node_modules` path directly

## Rules for Agents
1. New files must follow existing naming conventions
2. Never create files at project root — use appropriate subdirectory
3. Component files go in the owning domain's `components/` directory
4. Shared utilities must live in `src/lib/shared/`
5. Test files use `.test.ts` or `.test.tsx` suffix
6. Keep barrel exports (`index.ts`) updated when adding new files
