# Navigation Audit — Easy-Locs Super-App

**Date:** 2026-04-17
**Task:** #988
**Scope:** Full navigation audit across the 5 pillars (Dashboard, Radar, Orbit, Wallet, Me) and their sub-sections, plus admin/merchant/driver/pro/onboarding/auth/SEO/legal/deeplink groups. Identify and fix every "impossible to navigate" issue: duplicate routes, dead links, unreachable sub-sections, broken protected redirects, and hidden-nav traps.

---

## 1. Summary of findings

Three categories of navigability bugs were found and fixed in this task.

### 1.1 Duplicate route paths (React Router v6 first-match shadowing)

`src/routes/admin.routes.tsx` contained an entire **duplicated block** of `/admin/control/*` routes plus a duplicated block of legacy admin redirects (lines 161–184 in the previous version). The two blocks pointed at different shell components:

| Path | First block (winner) | Second block (dead code) |
| --- | --- | --- |
| `/admin/control` | `AdminShellWithChunkBoundary` | `AdminControlShellPage` |
| `/admin/control/agents` | same | dead |
| `/admin/control/runs` | same | dead |
| `/admin/control/command` | same | dead |
| `/admin/control/approvals` | same | dead |
| `/admin/control/master` | same | dead |
| `/admin/control/:section` | same | dead |
| `/admin/agents/:slug/runs` | `LegacyAgentRunsRedirect` | dead duplicate |
| `/admin/agents` | `LegacyControlRedirect → /admin/control/agents` | dead duplicate |
| `/admin/command-center` | legacy redirect | dead duplicate |
| `/admin/approvals` | legacy redirect | dead duplicate |
| `/admin/autonomy` | legacy redirect | dead duplicate |
| `/admin/control-room` | legacy redirect | dead duplicate |
| `/admin/engine-control-room` | legacy redirect | dead duplicate |
| `/admin/master-control` | legacy redirect | dead duplicate |

**Impact:** confusion for future maintainers, large blocks of unreachable code, risk that someone moves the second block above the first and silently switches the entire admin control plane to the wrong shell.
**Fix:** the second block was removed; a comment was left in its place pointing at the canonical block.

`src/routes/dashboard.routes.tsx` declared `/dashboard/command-center` **twice** (line 32 → `DashboardCommandCenter`, line 91 → `CommandCenter`). Same first-match shadowing — the second route was unreachable dead code.
**Fix:** the first declaration is now the canonical `/dashboard/command-center`. The legacy `CommandCenter` page was moved to `/dashboard/command-legacy` so any direct callers/tests still resolve.

After the fixes, `grep`-ing for duplicate `path="..."` declarations across `src/routes/*.tsx` returns **zero hits**.

### 1.2 Hidden-nav trap on the Orbit pillar

`src/config/navigation.ts` had `/orbit` in `HIDE_NAV_PREFIXES`. Both `MainBottomNav` and `SwipeableMain` use that array with a `startsWith` check, so the bottom nav was hidden on the **entire** Orbit pillar — including the Orbit landing page.

Result: clicking the Orbit tab from the bottom nav removed the bottom nav itself, leaving the user with no way back to Dashboard / Radar / Wallet / Me except the browser back button. Mobile users in standalone PWA mode have no back button.

**Fix:** `/orbit` was removed from `HIDE_NAV_PREFIXES` and a new helper `shouldHideBottomNav(pathname)` was added in `src/config/navigation.ts`. The helper preserves all previous prefix behaviour, plus:

- Bottom nav stays visible on `/orbit`, `/orbit/contacts`, `/orbit/add`, `/orbit/identity`, `/orbit/support` (all known sub-sections wired in `orbit.routes.tsx`).
- Bottom nav hides only on `/orbit/<conversationId>` (a real chat thread), where the chat header provides its own back affordance.

`MainBottomNav` and `SwipeableMain` were both updated to call `shouldHideBottomNav` instead of inlining the prefix check.

### 1.3 Other navigability checks

Items below were inspected and confirmed **OK** — no fix needed.

- **Pillar entry points** in `NAV_TABS_CONFIG` (`/`, `/radar`, `/orbit`, `/wallet`, `/me`) all map to live routes.
- **Root `/` and `/home`** route through `HomeRouter` / `MarketplaceHomeRouter` in `src/components/app/AppRouters.tsx` and gracefully fall back to `Index` for guests, `Dashboard` for verified users, and `/verify-email` for unverified users.
- **Wallet legacy paths** (`/wallet/hub` → `/wallet`, `/wallet/accounts` → `/settings/wallet`, `/orders` → `/my-orders`) all use `<Navigate replace />` correctly.
- **Driver legacy** (`/driver/earnings-v2` → `/driver/earnings`) and **SEO legacy** (`/seasonal-rentals` → `/seasonal-rentals-booking`, `/services` → `/browse/services`, `/marketplace/c2c` → `/annonces`) all use canonical redirects.
- **Admin legacy redirects** (`/admin/agents`, `/admin/command-center`, `/admin/approvals`, `/admin/autonomy`, `/admin/control-room`, `/admin/engine-control-room`, `/admin/master-control`, `/admin/agents/:slug/runs`) all forward to the unified `/admin/control/*` shell with query strings preserved (#863 design intentionally kept).
- **Pro pillar** uses nested routes under a `ProShell` with an `index` route — landing renders `ProDashboard`, no orphan sub-sections.
- **Onboarding wizards** (`/onboarding/hotel|taxi|service-provider|consumer`) are reachable from the role-selection step of the generic `/onboarding` flow.
- **Deep-link/QR resolvers** (`/qr/*`, `/sl/*`, `/go/*`, `/claim/:token`, `/p/*`, `/u/*`) are all non-protected so first-time tap-from-message works; they self-redirect to the relevant pillar after resolution.
- **Legal/SEO public pages** (`/terms`, `/privacy`, `/about`, `/contact`, `/help`, `/vision`, etc.) are unprotected and render directly.

---

## 2. Files changed

- `src/routes/admin.routes.tsx` — removed 24-line duplicated `/admin/control/*` + legacy-redirect block.
- `src/routes/dashboard.routes.tsx` — removed duplicate `/dashboard/command-center` declaration; legacy `CommandCenter` moved to `/dashboard/command-legacy`.
- `src/config/navigation.ts` — removed `/orbit` from `HIDE_NAV_PREFIXES`; added `shouldHideBottomNav(pathname)` helper.
- `src/components/navigation/MainBottomNav.tsx` — switched from inline prefix check to `shouldHideBottomNav`.
- `src/components/navigation/SwipeableMain.tsx` — same switch.
- `docs/NAVIGATION_AUDIT_2026_04_17.md` — this document.
- `docs/ROUTE_MAP.md` — full canonical route map (see next file).

---

## 3. Verification

- `grep -hE 'path="[^"]+"' src/routes/*.tsx | sort | uniq -c | awk '$1 > 1'` → no output (no duplicate paths remain).
- `HIDE_NAV_PREFIXES` is still exported (used directly by no other consumer; left in place for backward compatibility).
- React Router v6 first-match semantics now produce the intended canonical route for every formerly-duplicated path.

---

## 4. Out of scope

Per the task brief, the following were intentionally **not** changed:

- Visual redesign of the bottom nav or any pillar landing page.
- New features, new pillar tabs, or content additions.
- Deep audits of admin sub-tools beyond their route registration.
- Backend / Edge Function consolidation.
- Component-level refactor of pages that mount under each route.
