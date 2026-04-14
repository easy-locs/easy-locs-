# Coding Standards

## Language & Runtime
- **Frontend**: TypeScript + React + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **State**: Zustand stores
- **Backend**: Supabase (PostgreSQL + Edge Functions in Deno)
- **Orchestrator**: Node.js + TypeScript

## TypeScript Rules
- Use `interface` for object shapes, `type` for unions/intersections
- No `any` in new code — use `unknown` and narrow
- Export types from dedicated `types.ts` files
- Use discriminated unions for state machines

## React Patterns
- Functional components only
- Custom hooks for reusable logic (`use-*.ts`)
- Zustand for global state (no Redux, no Context for state)
- React Query for server state where applicable
- Error boundaries around domain modules

## Security
- All user input through `sanitizeText()`, `sanitizeEmail()`, etc.
- Rate limiting via `checkRateLimit()`
- CSRF tokens via `generateFormToken()`
- UUID validation via `isValidUUID()`
- Amount validation via `validateAmount()`

## Git Conventions
- Branch naming: `agent/<agent-name>/<issue-number>-<short-description>`
- Commit format: `<type>(<scope>): <description>` (conventional commits)
- Types: feat, fix, refactor, docs, test, chore
- PR descriptions must include: what changed, why, testing done
- One logical change per commit

## Code Quality
- No console.log in production code (use structured logging)
- Error messages must be actionable
- Functions under 50 lines; extract if longer
- No magic numbers — use named constants
- Dead code must be removed, not commented out

## Testing
- Unit tests for utilities and pure functions
- Integration tests for critical flows
- Test files co-located with source files
- Use `vitest` for testing

## Rules for Agents
1. Follow existing code patterns in the file being modified
2. Run TypeScript compilation check before committing
3. Never introduce new dependencies without justification
4. Prefer composition over inheritance
5. All public functions need JSDoc comments
6. Handle errors explicitly — no silent catches
