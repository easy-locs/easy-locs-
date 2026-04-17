# Auth E2E — Manual Validation Drop Zone (Task #797)

This folder holds human-captured evidence for the four end-to-end auth flows
called out in `../README.md` → "Manual validation required". Each flow has its
own subfolder; drop captures directly into it using the filenames below so the
bundle stays consistent.

Target environment: deployed Vercel frontend (production) talking to Supabase
project `ifvuvbolrmuuugtzxsfk`.

## Pre-flight (do once before running any flow)

- Confirm in Supabase Function Secrets that the following are set in production:
  - `EDGE_ROUTER_SECRET`, `OTP_HASH_SALT`
  - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`
    (and optionally `TWILIO_WHATSAPP_NUMBER`)
- Confirm `identity-router` is deployed (see parent README — it was 404 at the
  time this task was opened). If it is still 404, phone OTP cannot succeed and
  this task is blocked on the "Consolidate 175 Edge Functions" task.
- Open DevTools → Network tab, enable "Preserve log", clear console.
- Use a clean browser profile / incognito window per flow so sessions do not
  bleed between captures.

## Per-flow capture checklist

For each flow capture the following files into the matching subfolder:

| File                       | What it should contain                                         |
|----------------------------|----------------------------------------------------------------|
| `01-start.png`             | Screenshot of the login screen before interaction.             |
| `02-in-flight.png`         | Screenshot mid-flow (OTP entry / OAuth consent screen).        |
| `03-dashboard.png`         | Final screenshot of the post-login dashboard URL visible.      |
| `console.log`              | Copy of the browser console output for the whole flow.         |
| `network.har`              | HAR export of the Network tab for the whole flow.              |
| `notes.md`                 | Short notes: account/phone used (mask PII), timestamp, result. |

## Flows

### 1. `phone-otp/`
1. Go to the production login page, choose phone sign-in.
2. Enter a real phone number you control, request OTP.
3. Confirm SMS (or WhatsApp) is received.
4. Enter the code, submit.
5. Expect to land on `/dashboard` (or super-admin dashboard for super-admin
   accounts).
- Pass criteria: SMS received within ~30s, verify returns 200, app routes to
  the correct dashboard, session row visible in `auth.users` last_sign_in_at.

### 2. `google/`
1. From login, click "Continue with Google".
2. Complete Google consent.
3. Expect redirect through `/auth/callback` and arrival at the correct
   dashboard.
- Pass criteria: no console errors, `AuthCallbackPage` settles session before
  navigation, final URL is the correct dashboard.

### 3. `apple/`
Same as Google but via "Continue with Apple". Note that Apple only returns
name/email on first consent — capture both first-time and returning-user runs
if possible (`notes.md` should say which).

### 4. `hard-refresh/`
After completing any of the above flows:
1. Navigate to a protected route (e.g. `/dashboard`, `/radar`).
2. Hard-refresh (Cmd/Ctrl+Shift+R).
3. Confirm you stay signed in and on the same route (no bounce to `/login`).
4. Repeat once with a super-admin account to confirm super-admin routing is
   preserved.
- Pass criteria: no redirect to `/login`, no flicker to a wrong dashboard,
  no console errors from `AuthContext`.

## When all four folders are populated

Update the parent `README.md` "Manual validation required" section to link to
each flow's `notes.md` and flip the status from "out of scope" to "validated
on YYYY-MM-DD by <name>".
