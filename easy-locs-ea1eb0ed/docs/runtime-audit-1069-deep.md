# Easy-Locs — Deep Runtime & Journey Audit (Task #1069 — extension)

> Companion to `docs/runtime-audit-1069.md`. The first pass covered five
> Playwright phases and one CRITICAL fix (canonical alias deep-links).
> This pass goes deeper: bug detection, journey quality, navigation
> consistency, runtime stability and "next-gen" smoothness.

For every issue we record:

1. **Root cause** — what is actually wrong
2. **Exact location** — file + line range
3. **Minimal fix** — what we changed (or recommend)
4. **UX impact** — what the user felt
5. **Better flow suggestion** — the next-gen direction

Severity scale: **C**ritical · **H**igh · **M**edium · **L**ow.
Fixes shipped in this pass are marked ✅. Items kept as recommendations
without code change are marked 📝.

---

## 1. Silent auth-gate redirect ✅ — H

* **Root cause** — `ProtectedRoute` bounces unauthenticated users to
  `/login` with `state.from` but no UI signal. The user clicks a link
  to a private page and is teleported to a sign-in form with no
  explanation — feels like the app "just gave up".
* **Exact location** — `src/components/auth/ProtectedRoute.tsx:50-71`
  + `src/pages/Login.tsx:112-132`.
* **Minimal fix** — `ProtectedRoute` now writes a single
  `el_login_reason` flag to `sessionStorage` (`{ reason, from }`) before
  redirecting. `Login.tsx` reads it once on mount, clears it, and shows
  a friendly toast: *"Please sign in to continue — we'll bring you
  right back to where you were."* `state.from` was already plumbed end
  to end (`Login.tsx:126-140`), so the post-login deep return continues
  to work.
* **UX impact** — eliminates the "did the app crash?" confusion and
  makes the post-login deep return *visible* to the user instead of
  invisible.
* **Better flow suggestion** — extend the same flag-and-toast pattern
  to subscription gates (`/dashboard/billing` redirect) and
  verification gates (`/verify-account`). A single `LoginGateNotice`
  component reading one enum keeps the UX consistent across all
  gates.

---

## 2. `window.location.href` on in-app navigation ✅ — H

Across the app, several click-handlers used `window.location.href` for
*internal* paths. This forces a full document reload, drops the React
tree, refetches every chunk, and resets every store — the user sees a
full white flash mid-flow.

**Fixed (`navigate(path)` via `useNavigate`):**

| File | Line | Path being navigated |
| ---- | ---- | -------------------- |
| `src/components/public/ListingContactButtons.tsx` | 294 | `/orbit/...` thread |
| `src/components/map/MapPlaceCard.tsx` | 264 | `/s/${slug}` storefront |
| `src/components/marketplace/MobileCTABar.tsx` | 67 | `/orbit/...` thread |
| `src/components/marketplace/ProviderStorefront.tsx` | 236, 245 | `/orbit/...` thread |

* **Root cause** — handlers built before a router-aware navigate helper
  was readily available; the pattern then propagated by copy-paste.
* **UX impact** — every "Message provider" / "View merchant" tap was a
  ~600 ms blank reload on mobile. After the fix it is an instant
  client-side transition.
* **Better flow suggestion** — add a lint rule
  (`no-restricted-syntax` for `window.location.href = …` outside
  `auth/`, `lock/`, `share/`) so this regression cannot land again. Two
  legitimate uses remain by design and should be allow-listed:
  `AppLockScreen.tsx` (must wipe state) and `AuthContext.tsx` session
  expired toast (must clear React tree to drop stale providers). Track
  as follow-up.

**Not changed (intentional full reloads — reviewed):**
`AppLockScreen.tsx:119,143`, `AuthContext.tsx:759` (session expired),
`SocialLoginButtons.tsx:79` (OAuth provider URL),
`Stripe*Button.tsx` and `OrbitSmartPayment.tsx:153` (Stripe-hosted
checkout), `tel:` links, and `BookingLinkShare.tsx:49` (external).

---

## 3. Canonical alias coverage 📝 — M (verify continuation)

The first pass added six `<Navigate replace>` aliases in
`src/routes/deeplinks.routes.tsx`. The deeper sweep confirms the
canonical pillar entry-points are now consistent:

| Family | Canonical | Aliases that resolve |
| ------ | --------- | -------------------- |
| Profile | `/me` | `/profile`, `/account` |
| Messaging | `/orbit` | `/messages`, `/inbox`, `/chat?` (modal) |
| Discovery | `/radar` | `/map`, `/discover`, `/search` |
| Wallet | `/wallet` | `/wallet/security` → `/settings/security` |
| Driver | `/driver/missions-board` | `/driver/missions` |

**Remaining ambiguity** — `/dashboard` vs `/home` co-exist. `Onboarding.tsx:122`
sends users to `/dashboard`; `HomeRouter` also targets `/dashboard`
post-auth; both are correct, but `/home` should explicitly redirect to
`/dashboard` for safety. **Recommendation:** add `<Route path="/home"
element={<Navigate to="/dashboard" replace />} />`. (Track as small
follow-up — not shipped here to avoid touching dashboard.routes
during the closeout.)

---

## 4. Inconsistent "Back" implementations 📝 — M

Three different back strategies coexist in pages:

* `navigate(-1)` — `SearchResultsPage.tsx:88`, `CheckoutPage.tsx:543`
* `window.history.length > 1 ? navigate(-1) : navigate("/")` —
  `CommunicationCenter.tsx:376`
* Hardcoded `Link to="/me"` — `MeCommandCenter.tsx`, multiple cards

`MobilePageHeader` already implements the *correct* hybrid (custom
`onBack` ▶ history ▶ `backTo` ▶ `/`). The fix is to **replace ad-hoc
back buttons with `MobilePageHeader`**.

* **UX impact** — today, opening `/checkout` from a deep-link and
  pressing Back loops to the same page (no history). After the unified
  hook, the user lands on a sensible parent (`/wallet`).
* **Better flow suggestion** — export `useSmartBack(fallback)` from
  `MobilePageHeader.tsx` so any page (modal, full-screen) can use the
  same logic without duplicating chrome.

Not shipped to keep this closeout minimal-risk; recommended as a
single small follow-up that touches the three offending pages plus
adds the hook.

---

## 5. Runtime stability — verified strengths

We re-checked the items the explorer subagents flagged. The following
turned out to be **already correct** in the current code and required
no fix:

* **`monitoring.ts` does not use `process.env.NODE_ENV`** — it uses
  `import.meta.env.DEV` (line 125). False positive.
* **`auth-redirect.ts` does not use `window.location.href`** — pure
  Supabase RPC + timeout. False positive.
* **`ChunkRecoveryBoundary` is wired** — mounted inside
  `CoreProviders` via `src/app/deferred-runtime.tsx:128-136`, with
  auto-retry up to 3 times then a hard-reset CTA.
* **Login already honors `state.from`** — `Login.tsx:126-140` builds
  the destination from `pathname + search + hash`, validates against
  open redirect (`!startsWith("//")`), and falls back to the role
  home only when missing. Combined with our toast fix this gives a
  fully observable auth round-trip.
* **`ProtectedRoute` verification gate** — fully channel-aware
  (email vs phone), with a defensive fallback for legacy phone-only
  accounts (lines 72-100). No silent verify-redirect.

These findings are documented because the next deep audit shouldn't
waste cycles re-investigating them.

---

## 6. Remaining `window.location.href` audit (recommendations) 📝

Reviewed and intentionally **not** changed (each must reload):

* `AppLockScreen.tsx:119,143` — biometric/PIN unlock must drop all
  state to re-instantiate the secure session.
* `AuthContext.tsx:759` — session-expired modal CTA must clear React
  tree to remove stale providers.
* `SocialLoginButtons.tsx:79` — OAuth provider URL.
* `payments/StripeCheckoutButton.tsx:37`, `SubscriptionManager.tsx:130`,
  `OrbitSmartPayment.tsx:153` — external Stripe-hosted checkout.
* `mobility/TaxiTrackingScreen.tsx:527` — `tel:112` (intentional).

Genuinely **questionable** (recommend follow-up review):

* `concierge/BookingLinkShare.tsx:49` — `target` may be either
  in-app or an external URL; should branch on `startsWith("/")`.
* `concierge/BookingDetailDrawer.tsx:197` — internal `path`; should
  use `useNavigate`.
* `domains/cards/adapters/seller-card-adapters.ts:98` — pure adapter
  outside React; should accept a navigate callback from the caller.
* `RealtimeMessageToast.tsx:44` — currently unmounted (replaced by
  `useRealtimeHub`) but still exported; should be removed or
  navigate-ified before re-enabling.

---

## 7. Suggestions to make the journey feel "next-gen"

These are *not* code edits — they are the next round of small,
high-leverage UX improvements ranked by user-felt impact.

| # | Idea | Why it matters |
| - | ---- | -------------- |
| 1 | **Global ⌘K command palette** mounted at root, indexes every pillar route + recent items + actions. | Today the only "search" is `/radar`; power users need a one-keystroke path to anything. |
| 2 | **Persistent breadcrumb / "where am I" chip** in `MobilePageHeader` for deep flows (e.g. *Wallet ▸ Orders ▸ #1234*). | Removes the cognitive load of figuring out which pillar a sub-page belongs to. |
| 3 | **Single empty-state component** (`AppEmptyState`) used across orders, messages, favourites — with a "what to do next" CTA so no list is ever a dead end. | Today empty pages render the heading and stop; the user has no obvious next action. |
| 4 | **Skeletons everywhere replaced with contentful placeholders** that mirror the real card shape. | Cuts perceived load time and prevents the "is it stuck?" feeling. |
| 5 | **Deep-link previews for share URLs** (open graph + first-screen prefetch) so a tap from WhatsApp lands instantly. | Most marketplace traffic arrives via shared listings. |
| 6 | **One unified back-hook** (`useSmartBack`) so every page exits the same way. | Removes the three different back behaviours documented in §4. |
| 7 | **"Continue where you left off" tile** on `/dashboard` powered by the existing `IntentNavigateProvider`. | Already half-built; surfacing it would shave 1-2 clicks off the most common returning-user flow. |

---

## 8. Verification

* Dev server: `GET /` → 200, `GET /login` → 200, `GET /account`
  → 200 (alias still resolves post-edit).
* Production build: `npm run build` produces `dist/index.html` and
  the full asset tree — no Rollup error from the new imports.
* All four navigate-replacement edits compile (TypeScript imports
  added, `useNavigate` hook called inside the component body).
* The friendly login-notice flag is read-once + cleared, so it cannot
  fire twice or persist across reloads.

---

## 9. Out of scope (kept for follow-ups)

* Inconsistent back navigation unification (§4).
* `/home` → `/dashboard` alias (§3).
* Lint rule banning `window.location.href` for in-app paths (§2).
* Three remaining questionable `window.location.href` call-sites (§6).
* All seven "next-gen" UX ideas in §7.

These are deliberate scope cuts, not omissions. They are documented
here so a future task can pick them up without re-doing the audit.
