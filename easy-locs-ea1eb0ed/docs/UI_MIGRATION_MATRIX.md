# UI MIGRATION MATRIX — Prioritized Plan

## Priority Ranking

| Priority | Surface | Impact | Effort | Rationale |
|---|---|---|---|---|
| **P0** | DriverDashboard | High | ✅ DONE | Direct supabase fetch eliminated |
| **P1** | SellerDashboard | High | Medium | 2 direct fetches → repository + adapters |
| **P2** | AdminOps + AdminSuper | Medium | Low | Already using repositories, just wire adapters |
| **P3** | SmartHome sections | High | High | Complex ViewModel, progressive adoption |
| **P4** | Global widgets | Medium | Low | Wallet/Orbit/Notifications scattered reads |
| **P5** | Storefront components | Low | Medium | Non-card components, repository migration |

---

## P0 — DriverDashboard ✅ DONE

| Component | Before | After |
|---|---|---|
| `DriverDashboard.tsx` | `supabase.from("rider_presence")` direct | `useDriverLive()` + `setDriverLiveStatus()` |

---

## P1 — SellerDashboard

| Component | Current source | Target | Action |
|---|---|---|---|
| `SellerDashboard.tsx` | `supabase.from("marketplace_services")` | `seller.repository.ts` | Extract fetch to repository |
| `SellerDashboard.tsx` | `supabase.from("storefront_pages")` | `seller.repository.ts` | Extract fetch to repository |
| Seller cards | Not using adapters | `useSellerBusinessesCard()` + `useSellerListingLifecycleCard()` | Wire adapters progressively |

---

## P2 — Admin Dashboards

| Component | Current source | Target | Action |
|---|---|---|---|
| `AdminOpsDashboardPage.tsx` | `admin-ops.repository` ✅ | Wire `useOpsMetricsCard()` | Add adapter consumption |
| `AdminSuperDashboardPage.tsx` | `admin-ops.repository` ✅ | Wire `useSuperMetricsCard()` | Add adapter consumption |

Both already use repository pattern — just need to optionally consume card adapters for consistency.

---

## P3 — SmartHome (Progressive Strategy)

**Strategy**: SmartHome already uses `useDashboardViewModel()` which is clean. Don't break it.

Progressive adoption plan:
1. Card adapters internally consume `useDashboardViewModel()` — ✅ already done
2. Add `CardShell` wrappers around individual sections for loading/error/empty states
3. Don't replace the ViewModel — let adapters be **consumers of the same source**

| Section | Adapter | Action |
|---|---|---|
| Hero banner | `useHeroBannerCard()` | Wrap in CardShell for loading state |
| Category grid | `useCategoryGridCard()` | Wrap in CardShell for loading state |
| Trending/BestRated/Newest/NearYou | `useTrendingSectionCard()` etc | Wrap DynamicSection in CardShell |
| Context banners | `useContextBannersCard()` | Wrap in CardShell |
| Live map | `useLiveMapCard()` | Wrap in CardShell |
| Quick actions | `useQuickActionsCard()` | Skip — utility, no CardShell needed |
| Boost slot | `useBoostSlotHeroCard()` | Skip — delegated to BoostSlotRenderer |
| Onboarding | `useOnboardingChecklistCard()` | Skip — local only |

---

## P4 — Global Widgets

| Widget | Current | Target | Action |
|---|---|---|---|
| Wallet display | Scattered store reads | `useWalletBalanceCard()` | Consolidate |
| Orbit badge | Scattered | `useOrbitRecentChatsCard()` | Consolidate |
| Notification bell | Direct count | `useNotificationsBadgeCard()` | Consolidate |

---

## P5 — Storefront Components (Non-Card)

These are NOT cards — they're domain-specific management UIs. Target: repository pattern, not card system.

| Component | Action |
|---|---|
| `WarehouseManager.tsx` | Extract to `warehouse.repository.ts` |
| `MerchantCRM.tsx` | Extract to `crm.repository.ts` |
| `GrowthDashboard.tsx` | Extract to `growth.repository.ts` |
| `LaunchAudit.tsx` | Extract to `audit.repository.ts` |

---

## Success Criteria

| Metric | Current | Target Phase 1 | Target Phase 2 |
|---|---|---|---|
| Surfaces using adapters | 0/6 | 3/6 (Driver, Admin×2) | 6/6 |
| Surfaces using CardShell domain | 0/6 | 1/6 (SmartHome partial) | 4/6 |
| Direct supabase in UI components | ~15 | ~10 | ~5 |
| Fetch leaks in card surfaces | 1 (Driver) | 0 | 0 |
| Runtime validation tests | 0 | 5 core cards | 18 business cards |
