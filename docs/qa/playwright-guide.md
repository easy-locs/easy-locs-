# Guide suprême Playwright — Easy-Locs 2026

Single source of truth for running, organising, and extending the
Playwright test suites without conflicts.  Covers all three test layers
of the repository.

---

## Architecture des suites (3 niveaux)

| Suite | Répertoire | Config | Rôle |
|---|---|---|---|
| **Root E2E** | `tests/e2e/` | `playwright.config.ts` (root) | Flows critiques prod-ready |
| **Legacy E2E** | `easy-locs-ea1eb0ed/e2e/` | config interne | 21 specs fonctionnels |
| **Runtime Audit** | `easy-locs-ea1eb0ed/tests/runtime/execution/` | config interne | Phases 1–5 stress / mobile / deeplinks |

The root suite is the primary CI target.  The legacy and runtime-audit
suites are run locally or on demand.

---

## 1 · Variables d'environnement

Copy the template and fill in real values — **never commit real credentials**.

```bash
cp .env.e2e.local.example .env.e2e.local
# edit .env.e2e.local, then:
export $(grep -v '^#' .env.e2e.local | xargs)
```

`.env.e2e.local` is listed in `.gitignore`.

### Reference table

| Variable | Default | Purpose |
|---|---|---|
| `E2E_BASE_URL` | `http://localhost:5173` | App under test |
| `E2E_WORKERS` | `6` | Playwright worker count |
| `E2E_SHARDED` | `0` | `1` → adds Firefox + WebKit projects |
| `E2E_TEST_EMAIL` | — | Account for `authenticatedPage` fixture |
| `E2E_TEST_PASSWORD` | — | Password for above |
| `QA_EMAIL_USER` | — | Email-confirmed multi-profile account |
| `QA_EMAIL_PASSWORD` | — | Password for above |
| `QA_ADMIN_EMAIL` | — | Super-admin account |
| `QA_ADMIN_PASSWORD` | — | Password for above |
| `E2E_SUPER_ADMIN_EMAIL` | — | Same admin account (admin-control suite) |
| `E2E_SUPER_ADMIN_PASSWORD` | — | Password for above |
| `QA_EMPTY_EMAIL` / `QA_EMPTY_PASSWORD` | — | Account seeded with no data |
| `QA_HEAVY_EMAIL` / `QA_HEAVY_PASSWORD` | — | Account seeded with heavy data |
| `QA_PHONE_NUMBER` | — | Phone-OTP account |
| `QA_OTP_BYPASS_TOKEN` | — | Dev-only OTP bypass token |
| `LOAD_BASE_URL` | `$E2E_BASE_URL` | k6 load target |

When `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` are absent, tests that use
`authenticatedPage` or `signedInPage` skip automatically — they do **not**
fail.  This is the correct behaviour in fork PRs that cannot access
repository secrets.

### Worker isolation rule

Never share one test account across parallel workers.  Either use
`test.describe.serial()` for tests that require shared state, or provision
one dedicated account per shard and map them via separate env variables.

---

## 2 · Commandes maîtres

```bash
# Dev local — root suite, Chromium, 6 workers
npm run test:e2e

# Interactive UI (step-through debugging)
npm run test:e2e:ui

# Single spec file
npx playwright test tests/e2e/01-login-to-dashboard.spec.ts

# Cross-browser (Chromium + Firefox + WebKit)
E2E_SHARDED=1 npm run test:e2e

# Legacy suite
cd easy-locs-ea1eb0ed && npx playwright test --config=playwright.config.ts

# Runtime audit phases
cd easy-locs-ea1eb0ed && npx playwright test tests/runtime/execution/
```

---

## 3 · Ordre d'exécution et séquencement

Specs are numbered intentionally.  When running sequentially, honour this
order:

| Priority | Files | Notes |
|---|---|---|
| 1 | `01-login-to-dashboard`, `01-login` | Establishes session |
| 2 | `02-pillar-tour`, `02-signup` | Onboarding |
| 3–10 | `03-*` … `10-*` | Isolated features — safe to parallelise |
| 11 | `11-army-hierarchy` | Depends on edge functions — run isolated |
| 12–16 | `12-*` … `16-*` | Feature extras — parallelisable |
| 17–19 | `17-*`, `18-*`, `19-*` | Cross-pillar — require full app state |
| 20 | `20-service-worker-cache-swap` | Modifies SW — always last before admin |
| 21 | `21-admin-access` | Requires separate admin account |

With `fullyParallel: true` (the default) Playwright handles ordering
automatically.  Use `test.describe.serial()` only for tests that share
DOM/localStorage state within the same describe block.

---

## 4 · Fixtures — contrat de base

### Root suite (`tests/utils/setup.ts`)

```ts
import { test, expect } from '../utils/setup';
import { PROFILES } from '../fixtures/profiles';

// profile is an option fixture — set it to target a specific user profile.
test.use({ profile: PROFILES_BY_KIND.email_confirmed });

test('my test', async ({ signedInPage: page }) => {
  // signedInPage is already signed in via signInWithEmail().
  // Destructive-guard is pre-installed.
});
```

Available fixtures:
- `signedInPage` — page signed in for the chosen profile; skips when
  credentials are missing.
- `profile` — the active `Profile` object (option fixture).

### Legacy suite (`easy-locs-ea1eb0ed/e2e/fixtures/base.fixture.ts`)

```ts
import { test, expect } from './fixtures/base.fixture';

test('my test', async ({ authenticatedPage: page }) => {
  // page has a valid Supabase access_token in localStorage.
});
```

Available fixtures: `authenticatedPage`, `seededListingIds`,
`seedListing`, `seedListing2`, `seedWallet`.

---

## 5 · Anti-patterns à bannir

| ❌ Anti-pattern | ✅ Correctif |
|---|---|
| `page.waitForTimeout(3000)` fixe | `await expect(locator).toBeVisible({ timeout: N })` |
| Même compte entre workers parallèles | Comptes dédiés par shard ou `test.describe.serial()` |
| `page.waitForLoadState('networkidle')` systématique | `gotoSettled()` du helper runtime |
| `locator('.flex.gap-1 button').nth(0)` fragile | `getByRole('button', { name: /phone/i })` |
| `test.fail()` quand les credentials manquent | `test.skip(!isRunnable(profile), 'missing creds')` |
| Hardcoder `http://localhost:5173` dans un spec | Utiliser `baseURL` de la config (`page.goto('/')`) |

---

## 6 · Détection des crashes runtime

`easy-locs-ea1eb0ed/tests/runtime/execution/_helpers.ts` exposes three
utilities that every smoke test should use:

```ts
import {
  attachRuntimeRecorders,
  expectNoErrorBoundary,
  gotoSettled,
} from './_helpers';

test('no runtime crash on dashboard', async ({ page }) => {
  const rec = attachRuntimeRecorders(page);   // wire console/page/network listeners
  await gotoSettled(page, '/#/dashboard');    // goto + wait for real DOM render
  await expectNoErrorBoundary(page);          // assert no <ErrorBoundary> rendered

  const { consoleErrors, pageErrors, failedRequests } = rec.summary();
  expect(consoleErrors).toHaveLength(0);
  expect(pageErrors).toHaveLength(0);
  expect(failedRequests).toHaveLength(0);
});
```

`attachRuntimeRecorders` filters out known third-party noise
(favicon, chrome-extension, partytown, Sentry, Workbox, service worker)
so only app-originated errors surface.

`gotoSettled` uses `domcontentloaded` + a body-length poll instead of
`networkidle`, which is notoriously slow on Vite dev servers.

---

## 7 · Configuration Playwright root (`playwright.config.ts`)

The root config already matches optimal settings:

```ts
{
  fullyParallel: true,         // isolated workers, no shared state
  retries: CI ? 1 : 0,        // 1 retry on CI to absorb flakes
  workers: E2E_WORKERS,        // default 6, override via env
  timeout: 60_000,             // per-test global timeout
  expect: { timeout: 10_000 },
  use: {
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
}
```

Do not lower `actionTimeout` below `15 000 ms` — the Vite dev server cold
start can lag on first interaction.

---

## 8 · CI — workflow `.github/workflows/e2e.yml`

The workflow runs automatically on every push/PR to `main`.

```
push / PR to main
  └─ e2e job
       ├─ npm ci (root)
       ├─ playwright install --with-deps chromium
       ├─ npm ci + npm run build (easy-locs-ea1eb0ed)
       ├─ npm run preview & (background server)
       ├─ wait-on http://localhost:5173
       ├─ npm run test:e2e  (E2E_WORKERS=4)
       └─ upload test-results/ on failure
```

### Cross-browser run (manual trigger)

```yaml
workflow_dispatch:
  inputs:
    sharded: true
    workers: "4"
```

Triggers `E2E_SHARDED=1` → adds Firefox + WebKit projects.

### Required repository secrets

Add these in **Settings → Secrets → Actions**:

| Secret | Description |
|---|---|
| `E2E_TEST_EMAIL` | Account for `authenticatedPage` fixture |
| `E2E_TEST_PASSWORD` | Password for above |
| `QA_EMAIL_USER` | Email-confirmed multi-profile account |
| `QA_EMAIL_PASSWORD` | Password for above |
| `QA_ADMIN_EMAIL` | Super-admin account |
| `QA_ADMIN_PASSWORD` | Password for above |
| `QA_EMPTY_EMAIL` / `QA_EMPTY_PASSWORD` | Empty-data account |
| `QA_HEAVY_EMAIL` / `QA_HEAVY_PASSWORD` | Heavy-data account |
| `QA_PHONE_NUMBER` | Phone-OTP account number |
| `QA_OTP_BYPASS_TOKEN` | Dev-only OTP bypass |

Missing secrets → corresponding tests skip (not fail).

---

## 9 · Phases Runtime Audit (1–5)

Run in strict order — each phase builds on the previous:

| Phase | File | Focus |
|---|---|---|
| 1 | `phase1-core-access.spec.ts` | Public + auth routes, no crash |
| 2 | `phase2-primary-flows.spec.ts` | Login → dashboard → features |
| 3 | `phase3-edge-stress.spec.ts` | Concurrent navigation, edge functions |
| 4 | `phase4-mobile.spec.ts` | Mobile viewport, touch events |
| 5 | `phase5-deeplinks.spec.ts` | Direct URLs, hard refresh |

```bash
cd easy-locs-ea1eb0ed
npx playwright test \
  tests/runtime/execution/phase1-core-access.spec.ts \
  tests/runtime/execution/phase2-primary-flows.spec.ts \
  tests/runtime/execution/phase3-edge-stress.spec.ts \
  tests/runtime/execution/phase4-mobile.spec.ts \
  tests/runtime/execution/phase5-deeplinks.spec.ts \
  --workers=1
```

Use `--workers=1` so phases run strictly in order.

---

## 10 · Règles d'or — zéro conflit garanti

1. **Un worker = une session isolée** — never share `localStorage` across workers.
2. **Skip > fail** — tests without credentials must call
   `test.skip(!isRunnable(profile), '...')`, not `expect(...).toBe(true)`.
3. **Numérotation = priorité** — respect `01-` → `21-` ordering.
4. **`gotoSettled()` > `page.goto()`** — waits for real DOM render, not
   `networkidle`.
5. **`expectNoErrorBoundary()`** in every smoke test — catches silent crashes.
6. **Artifacts always uploaded on failure** — trace + screenshot + video in
   `test-results/`.
7. **Defective edge functions** (`army-tick`, `ai-router` with merge-conflict
   markers) → skip or mock tests that depend on them until the underlying
   pre-existing defects are resolved.

---

## 11 · Profils utilisateurs (multi-profile suite)

Eight canonical profiles are defined in `tests/fixtures/profiles.ts`:

| Kind | Env vars needed | Notes |
|---|---|---|
| `guest` | none | Anonymous, always runs |
| `email_confirmed` | `QA_EMAIL_USER`, `QA_EMAIL_PASSWORD` | Primary happy path |
| `phone_otp` | `QA_PHONE_NUMBER`, `QA_OTP_BYPASS_TOKEN` | Dev bypass required |
| `super_admin` | `QA_ADMIN_EMAIL`, `QA_ADMIN_PASSWORD` | Admin surfaces |
| `empty_data` | `QA_EMPTY_EMAIL`, `QA_EMPTY_PASSWORD` | Empty-state UX |
| `heavy_data` | `QA_HEAVY_EMAIL`, `QA_HEAVY_PASSWORD` | Performance |
| `expired_session` | same as `email_confirmed` | Session-expiry handling |
| `slow_network` | same as `email_confirmed` | CDP network throttle |

`isRunnable(profile)` returns `true` when the required credentials are
present, `false` otherwise.  Always guard with
`test.skip(!isRunnable(profile), 'missing creds')`.

---

## 12 · Safety — destructive-guard

`tests/utils/destructive-guard.ts` is auto-installed by the `signedInPage`
fixture.  It:

- Aborts HTTP requests matching destructive URL patterns (`/delete`, `/payouts`,
  Stripe charges, Twilio, SES, …).
- Blocks click events on buttons labelled `delete`, `transfer`, `payout`,
  `broadcast`, etc.

**Never remove this guard** from the fixture.  If a test legitimately needs
to call a destructive endpoint, it must mock the route explicitly.
