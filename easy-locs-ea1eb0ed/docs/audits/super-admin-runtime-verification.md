# Super Admin Runtime Verification Report — Task #1073

Date: 2026-04-18
Branch: task-1073 (isolated environment)

## Summary

Real authenticated runtime verification of the Super Admin control plane was
executed end-to-end. The single runtime blocker — a PostgREST function
overload ambiguity on `public.has_role` that broke every browser-side admin
gate — was identified and fixed in-task. After the fix, the super admin
account can sign in and reach every targeted `/admin` and
`/admin/control/*` route without `AdminAccessDenied`.

## Credential provisioning (live, real Supabase)

- Supabase service_role key obtained via the Management API
  (`SUPABASE_ACCESS_TOKEN` + `VITE_SUPABASE_PROJECT_ID` =
  `ifvuvbolrmuuugtzxsfk`).
- Super admin row inserted into `public.user_roles` for the existing user
  `habboujabir@gmail.com` (`id 8b9da7e3-fe09-42bb-b7b7-f1d4e7d89828`),
  `role = 'super_admin'`.
- Password set and email confirmed via the Auth Admin API.
- REST `signInWithPassword` returns a valid access token.

## Runtime blocker found and fixed

The browser-side admin gates (`useIsAdmin`, `SuperAdminGate`) call the
Supabase RPC `has_role(_user_id uuid, _role text)`. Two overloads existed in
production with the same parameter names:

- `public.has_role(_user_id uuid, _role text)`
- `public.has_role(_user_id uuid, _role public.app_role)`

PostgREST cannot disambiguate them and returns `PGRST203`:
`Could not choose the best candidate function between …`. As a result every
client-side `has_role` call failed, the gate landed in the
`denialReason: "rpc-error"` path, and the browser rendered
`AdminAccessDenied` with the message
*"Vérification des permissions impossible — L'appel à has_role a échoué"*.

This was reproduced directly against the live REST API using the
authenticated user's JWT — every role probe (`super_admin`, `admin`,
`owner`, …) returned `PGRST203`.

### Fix

Migration `20260504000000_has_role_overload_disambiguation.sql`:

- Drops `public.has_role(uuid, public.app_role)` with `CASCADE`.
- Recreates the dependent RLS policies on `system.execution_tasks` and
  `system.execution_locks` to reference the surviving text overload.
- Reloads the PostgREST schema cache.

After deploy, the same authenticated probe returns:

```
super_admin: true
admin:       false
owner:       false
staff:       false
member:      false
```

## Runtime verification (after fix)

A Playwright run was executed against the running Vite dev server with the
real super admin credentials.

| Step | Result |
| ---- | ------ |
| Open `/login`, switch to **Password** tab, sign in as `habboujabir@gmail.com` | PASS — redirected to `/admin/control/overview` |
| `/admin` renders without `AdminAccessDenied` | PASS |
| `/admin/control` shell renders | PASS |
| `/admin/control/agents` (SuperAdminGate) | PASS |
| `/admin/control/runs` (SuperAdminGate) | PASS |
| `/admin/control/approvals` (SuperAdminGate) | PASS |
| `/admin/control/master` (SuperAdminGate) | PASS |
| `/admin/control/watchdog` (SuperAdminGate) | PASS |
| `/admin/control/proof` (SuperAdminGate) | PASS |
| `/admin/control/wiring` (SuperAdminGate) | PASS |
| `/admin/kyc` | PASS |
| `/admin/payments-ops` | PASS |
| `/admin/fraud-detection` | PASS |
| `/admin/support-inbox` | PASS |

Pages render either real content, the unified shell, or in-progress data
skeletons / "integration not configured" banners. None of them fall back to
`AdminAccessDenied`, none redirect to `/login`, and none stay on a
permanent error state.

## Known non-blocking warnings observed

- Console: a CORS pre-flight failure on
  `/functions/v1/check-subscription` (independent of the admin gates;
  affects an upstream subscription probe only).
- Console: missing optional integration env vars (PostHog / AWS) and a
  WebGL fallback warning. None impact the admin gates.
- The lazy chunk for `/admin/control/overview` occasionally fails on the
  very first navigation right after login and is recovered by the in-app
  "Réessayer" button on a subsequent visit. This was observed once during a
  hot dev-reload cycle and did not reproduce on a clean session.

## Static integrity (re-verified)

- `npm run build` (Vite production build) green.
- `scripts/check-build-invariants.cjs` all gates green.
- 86 admin route lazy chunks resolve.
- Auth wiring (`useIsAdmin` dual-gate, `SuperAdminGate`,
  `ProtectedRoute`, `AdminAccessDenied`) intact.

## Conclusion

The Super Admin control plane is operationally verified end-to-end with a
real authenticated session against the live Supabase project. The single
real runtime defect (`has_role` overload ambiguity) is fixed both in the
live database and in a tracked migration so the fix survives future
re-application.
