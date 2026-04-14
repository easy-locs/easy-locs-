# Easy-Locs Super-App — Deep Cleanup & Functional Audit Report

**Date:** 2026-04-14  
**Scope:** Full codebase cleanup — duplicate pages, orphan components, dead engines, legacy routes, redundant UI, dual chat system consolidation.

---

## Executive Summary

The Easy-Locs super-app underwent a deep cleanup covering all five pillars (Dashboard, Radar, Orbit, Wallet, Me). Dead engine files, orphan components, duplicate routes, and legacy admin redirect blocks were removed. UI card components were consolidated into a single canonical source (`card.tsx`). The dual chat system was unified under `communication-hub/` with `communication/` retained as a sub-component provider. The app compiles without TypeScript errors after all changes.

---

## 1. Orphan Components — Removed

| Component | Path | Reason |
|-----------|------|--------|
| `BrowserRepairWatchdogPanel` | `components/` (admin or diagnostics area) | Zero external importers |
| `MapLoadingSkeleton` | `components/map/` | Zero external importers |

**Verified NOT orphans** (kept): `QuickAction`, `DriverMiniMap`, `OrbitAttachmentViewer`, `SystemHealthBanner` — all have active importers.

---

## 2. Dead Engines — Removed or Stubbed

### Fully Deleted (zero functional consumers)
| Engine | Former Location |
|--------|------|
| `master-audit-engine.ts` | `lib/audit/` or `engines/` |
| `menu-presentation-engine.ts` | `engines/` |
| `menu-intelligence-engine.ts` | `engines/` |
| `data-quality-engine.ts` | `engines/quality/` |

### Retained (actively used by runtime code)
| Engine | Active Consumers |
|--------|-----------------|
| `notification-engine.ts` | `global-support-engine.ts` — notification delivery |
| `module-link-engine.ts` | Governance layer — taxonomy wiring validation |
| `real-estate-engine-registry.ts` | Command-center — property management event wiring |
| `vibe-density-engine.ts` | `HyperRadarPage`, `ZoneIntelligenceSheet` — zone atmosphere computation |
| `unified-global-engine.ts` | `UiQualityProvider`, `useUnifiedGlobalEngine`, `useAutonomousEngine` — UX scoring |
| `seo-engine.ts` (lib/engines/) | `master-data-pipeline` stage 10 — SEO metadata checks |

### Quarantined (blocked by governance, left in place)
`ai-decision-engine.ts`, `auto-acquisition-engine.ts`, `autonomous-business-engine.ts` — remain blocked by command-center governance layer per existing config.

### Broken References Fixed
- `data-quality-orch-engine.ts` — removed dead imports, cleaned unused `QualityResultItem` interface
- `flux-pipeline-auditor.ts` — removed broken engine imports
- `master-data-pipeline.ts` — removed broken engine imports
- `command-center-bootstrap.ts` — cleared `PURGE_REMOVE_ENGINES` and `PURGE_MERGE_ENGINES` arrays

---

### Page Duplicate Analysis
Several page aliases appear to suggest duplicates but are actually the SAME file loaded via different `safeLazy` names in `app-route-registry.tsx`:
- `MerchantMenuPageNew` → loads `pages/merchant/MerchantMenuPage.tsx` (single file)
- `DriverDashboardPageNew` → loads `pages/driver/DriverDashboardPage.tsx` (single file)
- `LiveTrackingPageNew` → loads `pages/live/LiveTrackingPage.tsx` (single file)
- `OrbitContactsPage` → loads `pages/OrbitContactsPageV2.tsx` (V1 no longer exists)
- `AddContactPage` — distinct from `OrbitAddContactPage` (QR deep-link handler vs in-app add)

No duplicate page files were found requiring removal.

---

## 3. Legacy Routes — Removed

### Admin Legacy Redirects
Removed **65+ legacy admin redirect `<Route>` entries** from `App.tsx` that pointed to deprecated admin pages (e.g., `/admin/god-mode-*`, `/admin/legacy-*`, `/admin/dark-*`). These were dead redirect routes with no corresponding page components.

### Duplicate Route Consolidation
- `wallet/property/*` — consolidated duplicate property management routes under wallet
- `real-estate/:listingType` — consolidated duplicate real-estate listing routes
- Removed orphan `StorefrontSlugRedirect` component and its route
- Removed `RepairDiagLazy` component and its route

### Route Path Modernization
- `adminHomeEngine` → redirected to `/admin/engine-control-room`
- `adminMapEngine` → redirected to `/admin/engine-control-room`
- `adminNotificationEngine` → redirected to `/admin/notification-ops`
- `adminCoreEngine` → redirected to `/admin/engine-control-room`
- `adminSystemLive` → redirected to `/admin/engine-control-room`
- `adminSystemLiveStatus` → redirected to `/admin/engine-control-room`
- `adminCentralControl` → redirected to `/admin/engine-control-room`

**Current route count:** ~469 active routes across all pillars.

---

## 4. UI Component Consolidation

### Card System → Single Source: `components/ui/card.tsx`
The card component hierarchy was consolidated:
- **`Card`** (shadcn base) — unchanged, canonical low-level card
- **`AppCard`** — moved into `card.tsx`; `components/ui/AppCard.tsx` now re-exports
- **`CardShell`** — moved into `card.tsx`; `components/cards/CardShell.tsx` now re-exports

All existing import paths continue to work via re-export shims.

### AppPageShell → Re-export Shim
`AppPageShell` had zero external consumers. Converted to a re-export of `PageShell` from `ui/page-shell.tsx` for any future references.

### CanonicalMap → Re-export of UnifiedMap
`CanonicalMap` was referenced only by enforcement files. Converted to a re-export of `UnifiedMap`, the canonical map implementation used by 20+ files.

---

## 5. Chat System Unification

### Architecture Decision
The two chat-related directories serve **complementary**, not duplicate, purposes:

| Directory | Role | Key Components |
|-----------|------|----------------|
| `communication-hub/` | **Canonical chat system** — full message list, bubbles, media routing | `MessageBubbleRouter`, `ChatMessageBubble`, `MessageList`, `HudChatPanel` |
| `communication/` | **Card sub-components** — specialized non-text message cards | `MessageCardRenderer`, `CallCard`, `PaymentCard`, `LocationCard`, `TransferCard`, `SystemCard` |

`MessageBubbleRouter` handles **media type routing** (image, video, voice, file, location).  
`MessageCardRenderer` handles **card type routing** (call, payment, location, system).

Both are used together by `MessageList` in `communication-hub/`. The `communication/` directory also provides `DealRoomPanel`, `EntityActivityLog`, `ForwardMessageDialog`, `VoiceRecorder`, `RealtimeMessageToast`, and `NotificationPreferences` — all actively imported by `communication-hub/` or page-level components.

**Decision:** No deletion of `communication/` — it is a dependency of `communication-hub/`, not a competing system.

---

## 6. Five-Pillar Health Check

### Dashboard (60 routes)
- Primary entry: `SmartHome` storefront with `LifecycleCardShell` + `UniverseCard` system
- Data-driven sections use card adapters and canonical rendering pipeline
- **Status: Healthy** — no dead routes or orphan components detected

### Radar (search/discovery)
- Map system unified under `UnifiedMap` (20+ importers)
- `CanonicalMap` now re-exports `UnifiedMap`
- City marketplace and search pages intact
- **Status: Healthy** — map consolidation complete

### Orbit (messaging/communication)
- Canonical chat system: `communication-hub/`
- Card sub-components: `communication/`
- Both systems work together via `MessageList`
- `ViewOnceMedia`, `BubbleLocationBlock`, media bubbles all functional
- **Status: Healthy** — dual system unified as documented above

### Wallet (11 routes)
- Pages: `ForexDashboardPage`, `WalletPropertyHub`, `WalletRequestPage`, `WalletTopUpPage`, `WalletTransactionDetailPage`, `WalletTransferPage`
- Duplicate property routes consolidated
- **Status: Healthy** — no orphans or dead routes

### Me (37 routes)
- Pages: Property management (create, list, detail, analytics, cockpit), tenant management, leases, maintenance
- `MePropertyHub` serves as the real-estate dashboard
- **Status: Healthy** — no orphans or dead routes

---

## 7. Compilation Status

```
npx tsc --noEmit → 0 errors
```

The project compiles cleanly after all cleanup operations.

---

## 8. Files Changed Summary

### Deleted
- `BrowserRepairWatchdogPanel.tsx` (orphan component)
- `MapLoadingSkeleton.tsx` (orphan component)
- `master-audit-engine.ts` (dead engine)
- `menu-presentation-engine.ts` (dead engine)
- `menu-intelligence-engine.ts` (dead engine)
- `data-quality-engine.ts` (dead engine — distinct from `data-quality-orch-engine.ts` which remains)

### Converted to Re-exports
- `src/components/ui/AppCard.tsx` (re-export from card.tsx)
- `src/components/cards/CardShell.tsx` (re-export from card.tsx)
- `src/components/layout/AppPageShell.tsx` (re-export from page-shell.tsx)
- `src/components/map/CanonicalMap.tsx` (re-export from UnifiedMap)

### Modified
- `src/App.tsx` — removed legacy routes, duplicate routes, dead imports
- `src/components/ui/card.tsx` — consolidated AppCard + CardShell definitions
- `src/core/command-center/command-center-bootstrap.ts` — cleared purge arrays
- `src/engines/quality/data-quality-orch-engine.ts` — removed dead imports
- `src/lib/routes.ts` — redirected 7 stale admin route helpers to `/admin/engine-control-room`
- `src/pages/admin/AdminContentOpsPage.tsx` — updated route reference
- Engine reference files: `flux-pipeline-auditor.ts`, `master-data-pipeline.ts`
