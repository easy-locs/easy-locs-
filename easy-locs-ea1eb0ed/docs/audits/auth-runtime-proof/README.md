# Auth Edge Functions — Runtime Proof (P2 / Task #796)

Date: 2026-04-16
Production project: `ifvuvbolrmuuugtzxsfk` (https://ifvuvbolrmuuugtzxsfk.supabase.co)

## Scope

Technical deployment + reachability proof for the three auth edge functions:
`send-otp`, `verify-otp`, `auth-callback`.

End-to-end auth UX (real phone OTP delivery, real Google sign-in, real Apple sign-in,
hard-refresh session persistence on the deployed Vercel frontend) is **explicitly
out of scope of this proof bundle** and requires manual human validation against
production. See "Manual validation required" at the bottom.

## Result summary

All three functions are deployed to production Supabase and reachable. No 404s.

| Function        | Deploy | OPTIONS preflight | POST (happy/error) | Notes |
|-----------------|--------|-------------------|--------------------|-------|
| `send-otp`      | OK (v1, ACTIVE) | `200` + CORS | `probe` → `200`, missing phone → `400` | SMS/WhatsApp not configured in this env (`configured:false`) — Twilio creds need to be set as Supabase function secrets before real OTP delivery works |
| `verify-otp`    | OK (v1, ACTIVE) | `200` + CORS | Direct `POST` → `500` | Function is reachable. It is router-only by design (`requireRouterOrigin` in shared consolidation lib + `deploy-functions.sh` comment "All other functions are internal-only"). Direct calls without `EDGE_ROUTER_SECRET` produce `EDGE_FUNCTION_ERROR`; calls with the secret return `403 "Direct access denied. Use the domain router endpoint."`. Real client traffic goes through `identity-router`. **Action items:** (a) confirm `EDGE_ROUTER_SECRET` and `OTP_HASH_SALT` are set in production Supabase function secrets, (b) deploy `identity-router` itself — see note below — and then re-probe `POST /identity-router/verify-otp` for a router-mediated success/error transcript. |
| `auth-callback` | OK (v1, ACTIVE) | `200` + CORS | `GET` → `200`, `probe` → `200`, missing code → `400`, invalid code → `400` (`exchange_failed`) | Function did not exist in the repo before this task. A minimal handler was added at `supabase/functions/auth-callback/index.ts`. It exposes a server-side OAuth code-exchange fallback; the primary OAuth callback is still handled client-side in `src/pages/AuthCallbackPage.tsx`. |

CORS headers verified on every probe:
- `access-control-allow-origin: *`
- `access-control-allow-headers: authorization, x-client-info, apikey, content-type, x-supabase-client-platform, …`
- `access-control-allow-methods: POST, OPTIONS` (and `GET` for `auth-callback`)

## Files in this bundle

- `deploy-logs/functions-list.txt` — `supabase functions list` confirming `ACTIVE` status for all three functions.
- `probes/send-otp-options.txt` — OPTIONS preflight transcript.
- `probes/send-otp-post.txt` — `probe:true` (200) and missing-phone (400) transcripts.
- `probes/verify-otp-options.txt` — OPTIONS preflight transcript.
- `probes/verify-otp-post.txt` — direct-call transcripts (router-only, see notes).
- `probes/auth-callback-options.txt` — OPTIONS preflight transcript.
- `probes/auth-callback-post.txt` — GET status, probe, missing-code (400), invalid-code (400) transcripts.

## How probes were captured

```
BASE=https://ifvuvbolrmuuugtzxsfk.supabase.co/functions/v1
AK=$VITE_SUPABASE_PUBLISHABLE_KEY

curl -i -X OPTIONS "$BASE/<fn>" \
  -H "Origin: https://easy-locs.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization,content-type,apikey"

curl -i -X POST "$BASE/<fn>" \
  -H "Content-Type: application/json" \
  -H "apikey: $AK" -H "Authorization: Bearer $AK" \
  -H "Origin: https://easy-locs.com" \
  -d '<payload>'
```

Deploys were performed via the Supabase Management API:

```
supabase functions deploy send-otp      --project-ref ifvuvbolrmuuugtzxsfk --use-api
supabase functions deploy verify-otp    --project-ref ifvuvbolrmuuugtzxsfk --use-api
supabase functions deploy auth-callback --project-ref ifvuvbolrmuuugtzxsfk --use-api --no-verify-jwt
```

## identity-router status (relevant to verify-otp)

`identity-router` (the public entry point that proxies to `verify-otp`) is **not currently deployed** in this Supabase project — `POST /functions/v1/identity-router/verify-otp` returns `404 NOT_FOUND` (`{"code":"NOT_FOUND","message":"Requested function was not found"}`). Transcript: `probes/identity-router-verify-otp.txt`. Deploying the routers is covered by the existing project task "Consolidate 175 Edge Functions down to under 60" / `supabase/deploy-functions.sh`. Once `identity-router` is deployed, a successful router-mediated `verify-otp` transcript can be added here.

## Manual validation required (out of scope here)

The following must be exercised by a human against the deployed Vercel frontend with
real accounts/devices, then dropped into this folder as additional evidence:

1. **Phone OTP end-to-end** — request OTP on a real phone, receive SMS/WhatsApp, verify, land on `/dashboard`. Requires Twilio secrets configured (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, optionally `TWILIO_WHATSAPP_NUMBER`) plus `OTP_HASH_SALT` and `EDGE_ROUTER_SECRET`.
2. **Google OAuth** — full sign-in via Google, session settles before navigation, lands on the correct dashboard.
3. **Apple OAuth** — same as Google.
4. **Hard refresh on a protected route** — confirm session persists and route guards (super_admin → super dashboard, others → `/dashboard`, unauth → `/login`) behave unchanged.

For each, capture: browser console log, network tab HAR or screenshot, and a final
screenshot of the post-login dashboard. Store under `e2e/<flow>/`.
