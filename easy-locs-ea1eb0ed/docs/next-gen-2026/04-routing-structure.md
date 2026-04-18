# 04 — Routing Structure

> Step-1 deliverable for Task #1075. One route registry, per-pillar files,
> consistent with `ARCHITECTURE_GUARDRAILS.md`. No divergent routes for the
> same action.

## Hard rules (mirror of guardrails)

- `src/App.tsx` is a provider shell — **zero `<Route>` elements**.
- `src/routes/index.tsx` is the aggregator — only the catch-all
  `<Route path="*">` and `<Route path="/seo/*">` are permitted there.
- Every other route lives in its pillar file:
  `src/routes/<pillar>.routes.tsx`.
- Pillar route files **must not import** other pillar route modules.
  Cross-pillar composition happens only in `src/routes/index.tsx`.
- ESLint enforces these rules; `npm run lint` fails with a pointer to the
  correct pillar file when violated.

## Pillars

| Pillar | File | Top-level base path |
|--------|------|---------------------|
| Public / marketing | `public.routes.tsx` | `/` (landing, legal, marketing) |
| Auth | `auth.routes.tsx` | `/auth/*` |
| Account | `account.routes.tsx` | `/account/*` |
| Wallet | `wallet.routes.tsx` | `/wallet/*` |
| Orbit (comms) | `orbit.routes.tsx` | `/orbit/*` |
| Onboarding | `onboarding.routes.tsx` | `/onboard/*` |
| Verticals — food | `food.routes.tsx` | `/food/*` |
| Verticals — taxi | `taxi.routes.tsx` | `/taxi/*` |
| Verticals — services | `services.routes.tsx` | `/services/*` |
| Merchant dashboard | `dashboard.routes.tsx` | `/dashboard/*` |
| Super Admin | `admin.routes.tsx` | `/admin/*` |
| Radar | `radar.routes.tsx` | `/radar/*` |
| SEO landing surfaces | (handled in `index.tsx`) | `/seo/*` |

> Note: the existing repo already has `dashboard.routes.tsx`,
> `admin.routes.tsx`, and `radar.routes.tsx`. New pillar files added in
> Phase 1 must follow the same conventions and pass the existing ESLint rule.

## Canonical paths (binding)

### Auth
- `/auth/login`
- `/auth/signup`
- `/auth/otp`
- `/auth/recover`
- `/auth/callback`

### Account (single canonical surface for the user's own profile)
- `/account` — overview
- `/account/profile`
- `/account/security`
- `/account/notifications`
- `/account/sessions`

### Wallet (single canonical surface)
- `/wallet` — overview
- `/wallet/transactions`
- `/wallet/topup`
- `/wallet/payout`
- `/wallet/methods`

### Orbit
- `/orbit` — channel list
- `/orbit/:channelId`
- `/orbit/new`

### Onboarding
- `/onboard` — entry (email / phone / website / business name)
- `/onboard/status/:runId`
- `/onboard/complete/:merchantId`

### Verticals (one shape per vertical)
For every vertical `<v>` in `{food, taxi, services}`:
- `/<v>` — vertical home
- `/<v>/search`
- `/<v>/m/:merchantId`
- `/<v>/m/:merchantId/order`
- `/<v>/orders/:orderId`
- `/<v>/orders/:orderId/track`

> The vertical paths share **identical** semantics. The vertical only varies
> the catalog and order metadata; navigation, account, wallet, and Orbit
> entry points are identical.

### Merchant dashboard
- `/dashboard`
- `/dashboard/orders`
- `/dashboard/catalog`
- `/dashboard/messages`
- `/dashboard/wallet`
- `/dashboard/settings`

### Super Admin (Phase 10)
See `07-dashboard-structure.md`. Routes live under `/admin/*` and must be
gated by `roles.includes('super_admin')` at both the route guard and the
service layer.

## Same-action / same-state guarantee (Phase 3 exit gate)

For each canonical action below, all entry mechanisms (URL, button click,
deep link, redirect) MUST land in the same route, with the same loaders, the
same params, and the same resulting state.

| Action | Canonical route | Allowed entry surfaces |
|--------|-----------------|------------------------|
| Top up wallet | `/wallet/topup` | header CTA, dashboard CTA, post-checkout fallback |
| Open a chat with a merchant | `/orbit/:channelId` | merchant card, order page, search result |
| View an order | `/<v>/orders/:orderId` | dashboard list, notification, deep link |
| Start onboarding | `/onboard` | landing CTA, admin "invite", marketing pages |
| Open profile | `/account/profile` | avatar menu, notification settings link |

A parity test matrix in Phase 3 verifies that every (action × entry surface)
pair lands on the canonical route.

## Guards + loaders

- Every protected pillar mounts a single `RequireAuth` guard at the pillar
  root. No per-route auth checks scattered across components.
- Loaders go through the service layer only. No direct DB calls in
  loaders / route components.
- 404 lives only in `src/routes/index.tsx` as the catch-all.

## Forbidden

- New top-level routes outside a pillar file.
- Hard-coded path strings in components — paths come from a typed
  `routes.ts` map per pillar.
- Aliases that point at the same canonical destination (e.g.
  `/me/profile` → `/account/profile`) without a permanent redirect at the
  router level.
