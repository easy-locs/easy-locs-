# Core Auth Usability — Manual Verification Checklist (Task #1025)

This document captures the end-to-end happy-path checks that must pass for the
core app to be usable. It is the manual companion to the automated work in
Task #1025 (Phase 1).

## Scope

Phase 1 covers ONLY: open app → log in → reach `/dashboard` → navigate ≥ 3
pages without blank screens, redirect loops, or stuck loaders. Out of scope:
new features, marketplace/maps/news/billing changes, or visual redesign.

## Pre-flight

- Test against a freshly-built bundle (`cd easy-locs-ea1eb0ed && npm run build`).
- Use one verified email account and one verified phone account.
- Clear `localStorage` between runs to confirm cold-start behavior.

## A. Email + password login

1. Open `/login`. The form renders within ~1s; no infinite spinner.
2. Submit valid credentials. Within 12s the user lands on `/dashboard`.
3. Submit invalid credentials. A destructive toast appears; the form is usable
   again (no permanent disabled state).
4. Hard refresh while on `/dashboard`. Session is restored; the user stays on
   `/dashboard` (no bounce to `/login` or `/verify-account`).

## B. Phone OTP login

1. Open `/login` and choose the Phone tab. Enter a verified phone number.
2. Submit. The OTP step appears with the 6-digit code inputs.
3. Enter a valid OTP. The brief "Activating your account…" state shows, then
   the user lands on `/dashboard`. The user is NOT routed to `/verify-account`
   or `/verify-email` at any point.
4. Enter an invalid OTP. A clear error toast appears; inputs reset; user can
   retry.
5. Hard refresh on `/dashboard`. Session persists. Phone-only users (no email
   on record) are not bounced to `/verify-account`.

## C. Session persistence

1. Log in (either method) → close the tab → reopen the app at `/dashboard`.
   Session is restored within ~9s and the user remains on `/dashboard`.
2. With cached auth in `localStorage`, the auth context shows the
   "Restoring your session…" banner while it works, then resolves; never
   leaves an indefinite spinner.

## D. Navigation through 3+ dashboard pages

After login, navigate in order to confirm none returns a blank screen, dead
button, or auto-redirect loop:

1. `/dashboard`
2. `/dashboard/settings`
3. `/dashboard/profile`
4. `/dashboard/news`

Pro-gated routes (e.g. `/dashboard/finances`) intentionally redirect a user
without an active subscription to `/dashboard/billing`. That is by design and
NOT a dead-end — the billing page renders normally.

## E. Error surfacing

- Bad password → destructive toast.
- Hung Supabase auth → request times out at 12s and shows the infra-error
  toast ("service temporairement indisponible").
- Slow `getSession()` on /login → bounded at 4s; if the user has a session,
  the auth-state-change listener still drives the redirect when it eventually
  arrives.
- Slow `has_role` RPC during post-login → bounded at 2.5s; user falls back to
  `/dashboard` instead of hanging on `/login`.

## Automation gap

E2E coverage for these flows does NOT yet exist in CI. Follow-up Task #1036
covers adding Playwright specs that pin this behavior so the same regressions
cannot silently return.
