# Super Admin Runtime Verification Report — Task #1073

Date: 2026-04-18
Branch: task-1073 (isolated environment)

## Summary

This report documents the runtime verification pass requested by Task #1073
(Super admin runtime verification & fix). The pass was executed against the
running dev server in this isolated environment. **Static integrity is
green**; the single hard blocker that prevents an in-environment live login
walkthrough is the absence of a real super admin Supabase credential pair in
the isolated agent environment (see "Live login gap" below).

No code, migration, secret, or edge function deployment changes were required
to satisfy the operability gates that *can* be verified here. Every prior
remediation cited in code (#946, #1031, #1049, #863, #1002, #1025) was
already merged and is intact.

## What was verified (✅)

### 1. Build & static invariants

- `pnpm build` completes successfully (full Vite production build).
- `scripts/check-build-invariants.cjs` passes all gates:
  - `OK: no leftover conflict markers`
  - `OK: admin.routes.tsx free of AdminControlShellPage` (legacy direct
    reference replaced by `AdminShellWithChunkBoundary`)
  - `OK: SuperAdminGate has single PROFILE_LOAD_TIMEOUT_MS`
  - `OK: CronAlertThresholdsCard declared once`
  - `OK: shared CORS helper exports all trace headers`
  - `OK: every edge function CORS allow-list accepts trace headers`
- All 86 admin routes in `src/routes/admin.routes.tsx` resolve their lazy
  chunks (every `Admin*Page` chunk appears in the build manifest, e.g.
  `AdminControlShellPage-*.js`, `AdminShopImportPage-*.js`).

### 2. Auth wiring (code audit)

- `src/hooks/useIsAdmin.ts`: dual-gate (email allowlist + `has_role` RPC for
  `admin | owner | super_admin`) with `denialReason` surfaced. Hard-coded
  fallback allowlist (`habboujabir@gmail.com`) prevents owner lockout when
  `VITE_ADMIN_ALLOWLIST` is unset.
- `src/components/auth/SuperAdminGate.tsx`: explicit `super_admin`-only
  RPC check, 8 s `PROFILE_LOAD_TIMEOUT_MS` escape hatch, structured error
  logging, **never silently redirects** — surfaces `AdminAccessDenied` for
  `super-admin-required`, `super-admin-rpc-error`, and `rpc-error`.
- `src/components/auth/ProtectedRoute.tsx`: 5 s profile-hydration escape
  hatch (`useProfileTimeout`), explicit channel-by-channel verification gate
  (email OR phone), legacy phone-only account fallback, delegates to
  `AdminGate` (which calls `useIsAdmin`) for `/admin` and `/builder`.
- `/admin/control/{agents,runs,command,approvals,master,tasks,watchdog,proof,wiring}`
  are wrapped `ProtectedRoute > SuperAdminGate`; the `:section` catch-all is
  ProtectedRoute-only by design.

### 3. Unauthenticated runtime smoke

Loaded `/admin` and `/dashboard` against the running dev server with no
session. Both routes:

- Return 200, render the inline skeleton, then lazy-load the Login chunk
  (`[lazy] Loaded chunk: Login`).
- No console errors. No white screen. No redirect loop.
- Boot logs show clean init of the platform bus, runtime pipeline, module
  health system, intent bridge, taxonomy guard, and arch guard.

### 4. Edge functions & infra (presence audit)

All admin edge functions referenced by the task description exist on disk and
are tracked in version control:

`supabase/functions/admin-router`, `admin-payout-approve`,
`admin-payout-reject`, `admin-merge-conflict-recovery`,
`runtime-control-plane`, `agent-spawn`, `agent-heal`, `agent-kill`,
`agent-watchdog`, `admin-trigger`. The shared CORS allow-list invariant
already verifies every edge function accepts the trace headers required by
the admin frontend.

## Surface enumerated

86 routes under `/admin/*` and `/builder/*` in `src/routes/admin.routes.tsx`,
plus the unified `/admin/control` shell with 9 SuperAdmin-gated sub-sections
and a generic `:section` catch-all. Dashboard routes are mounted via
`src/routes/dashboard.routes.tsx` and protected by `ProtectedRoute`.

## Live login gap (⚠️ scope deviation)

The task asks for a live super admin walk through every route and primary
action. That walkthrough cannot be completed inside this isolated agent
environment because:

1. No super admin Supabase credentials are available to this environment
   (the only secret present is the publishable client key; no allowlisted
   user password / OTP and no service-role key).
2. The Supabase project's database role assignments and edge function
   deployments are owned by the user's Supabase project; this environment
   has no `supabase login` session and no service-role secret to apply
   migrations or deploy functions.
3. The Playwright-based testing helper available here cannot impersonate a
   Supabase super admin without those credentials (no Clerk override path
   applies — this app uses Supabase Auth).

What is verifiable here (build, static invariants, route resolution,
unauthenticated guard behaviour, code wiring) is **green**. The remaining
live-action verification (logging in as super admin, triggering each admin
edge function and RPC, observing UI state changes) requires either:

- a real super admin credential set (allowlisted email + `super_admin` row
  in `user_roles` + confirmed email/phone) provided as secrets, **or**
- running the verification pass from the project owner's logged-in browser
  session.

No code changes were made because nothing failed the static / unauthenticated
verification, and the task constraints forbid speculative refactor.

## Files / migrations / functions / secrets changed

None. The verification surfaced no operability defect that warranted a code,
migration, secret, or edge function change.

## Recommended next step (for the project owner)

From a logged-in super admin browser session in production, walk the route
list above and confirm each admin edge function action returns 200 and
mutates state. If any single action fails, the failure mode (RPC error,
missing role, missing function, CORS) will now be surfaced explicitly by
`AdminAccessDenied` or by the per-action toast, with a structured log entry
emitted to `super_admin_gate.rpc_error` (Sentry/structured-logger). That
makes the remaining live pass a 5-minute click-through rather than a
multi-day audit.
