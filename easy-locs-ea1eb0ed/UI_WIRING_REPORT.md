# UI Wiring Report

## Summary
The `useUiEngine()` hook is wired to **10 user-facing pages** and **1 admin page**. It runs a lightweight DOM audit on mount, detects accessibility issues, contrast problems, missing labels, layout breakage, and emits a telemetry report via `platformBus.emit("ui-engine:report")`.

## Wired Pages

| # | Page | File | Route | Status |
|---|------|------|-------|--------|
| 1 | Dashboard | `src/pages/Dashboard.tsx` | `/dashboard` | ACTIVE |
| 2 | HyperRadar | `src/pages/HyperRadarPage.tsx` | `/radar` | ACTIVE |
| 3 | Communication Center | `src/pages/CommunicationCenter.tsx` | `/orbit` | ACTIVE |
| 4 | Wallet Hub | `src/pages/WalletHubPage.tsx` | `/wallet` | ACTIVE |
| 5 | Me Command Center | `src/pages/MeCommandCenter.tsx` | `/me` | ACTIVE |
| 6 | Onboarding | `src/pages/Onboarding.tsx` | `/onboarding` | ACTIVE |
| 7 | Shop Page | `src/pages/ShopPage.tsx` | `/shop/:id` | ACTIVE |
| 8 | Public Listing | `src/pages/PublicListing.tsx` | `/listing/:id` | ACTIVE |
| 9 | Merchant Dashboard | `src/pages/MerchantDashboardPage.tsx` | `/merchant/dashboard` | ACTIVE |
| 10 | Property Detail Hub | `src/pages/PropertyDetailHub.tsx` | `/property/:id` | ACTIVE |
| 11 | Admin UI Engine (monitor) | `src/pages/admin/AdminUiEnginePage.tsx` | `/admin/ui-engine` | ACTIVE |

## Telemetry Format
Each page emits to `platformBus` channel `"ui-engine:report"`:
```json
{
  "route": "/dashboard",
  "score": 92,
  "issueCount": 3,
  "patchCount": 1,
  "timestamp": "2026-04-11T..."
}
```

## Coverage
- **5 Pillars covered**: Dashboard, Radar (HyperRadar), Orbit (CommunicationCenter), Wallet (WalletHub), Me (MeCommandCenter)
- **Business pages covered**: Onboarding, ShopPage, PublicListing, MerchantDashboard, PropertyDetailHub
- **Admin monitoring**: AdminUiEnginePage shows aggregated UI quality metrics
- **Pages NOT wired** (intentionally): Admin pages (engine internals, not user-facing), auth pages (minimal UI), error pages

## Architecture
```
useUiEngine(pageName)
  ├─ runs DOM audit (a11y, contrast, labels, layout)
  ├─ computes score 0-100
  ├─ applies auto-patches (minor fixes)
  └─ emits platformBus "ui-engine:report" { route, score, issueCount, patchCount }
       └─ consumed by AdminUiEnginePage for monitoring
```
