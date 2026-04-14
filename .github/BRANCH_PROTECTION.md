# GitHub Repository Settings

## Branch Protection Rules for `main`

Configure these settings in GitHub repository Settings > Branches > Add rule:

### Branch name pattern: `main`

- [x] Require a pull request before merging
  - [x] Require approvals (minimum: 1)
  - [x] Dismiss stale pull request approvals when new commits are pushed
- [x] Require status checks to pass before merging
  - [x] Require branches to be up to date before merging
  - Required status checks:
    - `TypeScript Check`
    - `ESLint`
    - `Vitest Suite`
    - `UI Quality Gate`
    - `Determinism Check`
    - `Enforce Branch Naming`
    - `Production Build`
- [x] Require conversation resolution before merging
- [x] Do not allow bypassing the above settings
- [ ] Restrict who can push to matching branches (optional — enable for strict teams)

## GitHub Environments

### `staging`
- Used by: Vercel Preview Deployment workflow
- No approval required
- Deployed on every PR

### `production`
- Used by: Vercel Production Deployment workflow, Rollback workflow
- Requires approval from at least 1 reviewer (optional — configure in Settings > Environments)
- Deployed on merge to `main`
- Production deployment only triggers after CI Pipeline succeeds (workflow_run gating)
- Deploys the exact CI-validated commit SHA (not HEAD)

## Rollback Strategy

The rollback workflow is merge-strategy-agnostic and uses deployment tags:

**How it works:**
- Each production deployment tags the deployed commit as `deploy/production-latest` (moving tag)
  and `deploy/production-<timestamp>` (permanent history tag)
- Rollback resolves the last deployed SHA from `deploy/production-latest`, not from git history
- This works regardless of merge method (merge commit, squash, rebase)

**Steps:**
1. Trigger via Actions > Production Rollback > Run workflow
2. Type `ROLLBACK` and provide a reason
3. The workflow resolves the actual deployed SHA from `deploy/production-latest`
4. Validates the SHA exists on `main` branch
5. Creates a `hotfix/rollback-*` branch with the revert commit
6. Opens a PR against `main` with rollback/production/urgent labels
7. CI runs on the revert PR (quick pass since it reverts to known-good state)
8. Merge the PR to trigger production redeployment

**Safety:** Fails fast with explicit error if no deployment tag exists or if the
deployed SHA cannot be resolved on `main`.

## Required Secrets

Configure in Settings > Secrets and variables > Actions:

| Secret | Description |
|--------|-------------|
| `VERCEL_TOKEN` | Vercel API token for deployments |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key |

## Branch Naming Convention

All branches must follow the pattern: `<type>/<description>`

Allowed prefixes:
- `feat/` — New features
- `fix/` — Bug fixes
- `agent/` — Agent-generated changes
- `chore/` — Maintenance tasks
- `docs/` — Documentation changes
- `refactor/` — Code refactoring
- `test/` — Test additions/changes
- `ci/` — CI/CD changes
- `hotfix/` — Urgent production fixes
- `release/` — Release preparation
