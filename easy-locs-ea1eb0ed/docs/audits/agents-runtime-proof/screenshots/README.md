# Dashboard / UI Screenshots

## What is here

- `super_dashboard.jpg` — capture of the in-app super-admin dashboard route
  (`/admin/super-dashboard`) loaded from the running web app workflow. The
  route is gated behind `<SuperAdminGate>` and the audit environment has no
  authenticated super-admin session, so the visible content is the gate
  skeleton. The capture is included as evidence that the route exists and
  resolves.

## Why no Supabase Studio screenshots

Supabase Studio (`https://supabase.com/dashboard/project/ifvuvbolrmuuugtzxsfk`)
requires an interactive login that this CLI environment cannot perform. The
following structured artefacts are the equivalent state captures the
dashboard would render, gathered against the same project from the
Management API + analytics endpoints + admin SQL:

| Studio view | Equivalent file in this bundle |
|---|---|
| Edge Functions list (status / version) | `../management-api/functions_list.json` |
| Edge Function — Logs tab (request log) | `../function-logs/edge_invocations_all.json` |
| Edge Function — Runtime tab (Deno stderr/stdout) | `../function-logs/runtime_logs_all.json` |
| Database — Tables panel | `../sql-snapshots/schema_after.json` |
| API Settings — Exposed schemas | `../management-api/postgrest_patch.json` |
| Project secrets list | `../management-api/set_router_secret.json` |

## Why this README was rewritten

A previous version of this file claimed the agent functions were "not
deployed". That statement was written before the rollout and is no longer
true: see `../management-api/functions_list.json` for proof that all four
functions are ACTIVE and `../agent-driven-lifecycle/` for proof of real
agent-path execution against the deployed code.
