## Summary

<!-- Briefly describe the change and its purpose -->

## Type of Change

- [ ] Feature (`feat/`)
- [ ] Bug fix (`fix/`)
- [ ] Agent-generated (`agent/`)
- [ ] Refactor (`refactor/`)
- [ ] Chore / Infra (`chore/`, `ci/`)
- [ ] Documentation (`docs/`)

## Architecture Compliance Checklist

- [ ] No direct Supabase client imports (use `db` from `@/services/db`)
- [ ] No deprecated shell imports (`AppPageShell`, `UniversePageShell`, `SEOPageShell`)
- [ ] Uses `PageShell` from `@/components/ui/page-shell` for page layout
- [ ] No v1/v2 component duplication — old version removed or migrated
- [ ] Domain boundaries respected (wallet, orbit, me, radar, storefront are isolated)
- [ ] Design tokens used from `@/config/ui.ts` — no hardcoded hex colors
- [ ] `useUiEngine` hook used for UI-engine-aware pages

## Testing

- [ ] Vitest tests pass (`npm run test`)
- [ ] UI Quality Gate passes (`bash scripts/ui-quality-gate.sh`)
- [ ] TypeScript compiles clean (`npx tsc --noEmit --skipLibCheck`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Manually tested in browser

## Pillar Impact

<!-- Which pillars/engines does this PR affect? -->

- [ ] Dashboard
- [ ] Wallet
- [ ] Orbit (Contacts)
- [ ] Me (Command Center)
- [ ] Radar (HyperRadar)
- [ ] Storefront
- [ ] Engine core (`src/engines/`)
- [ ] UI Engine (`src/lib/ui-engine/`)
- [ ] Infrastructure / CI/CD
- [ ] None of the above

## Screenshots / Preview

<!-- Add screenshots or link to Vercel preview deployment -->

## Additional Notes

<!-- Any breaking changes, migration steps, or things reviewers should know -->
