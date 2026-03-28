# Orbit Legacy Consumer Migration Plan

## Status: In Progress

---

## Bridge: `chatStore.ts` (DEPRECATED)
**Active consumers: 2**

| # | Consumer | Uses | Migration Target | Priority |
|---|----------|------|------------------|----------|
| 1 | `src/stores/bookingStore.ts` | sendMessage, conversations | `orbit/thread.store` + `orbit/message.serializer` | P0 |
| 2 | `src/stores/propertyManagementStore.ts` | sendMessage | `orbit/thread.store` + `orbit/message.serializer` | P0 |

**Removal condition**: Zero imports remain → delete bridge file.

---

## Bridge: `orbitStore.ts` (ACTIVE — 27 consumers)

### Tier 1 — Stores (migrate first, highest leverage)
| # | Consumer | Uses | Migration Target |
|---|----------|------|------------------|
| 1 | `stores/bookingStore.ts` | profile.id, profile.orbitId | `orbit/thread.store` (orbitId) |
| 2 | `stores/listingStore.ts` | profile.id | Auth context (userId) |
| 3 | `stores/analyticsStore.ts` | profile.id | Auth context (userId) |
| 4 | `stores/favoritesStore.ts` | profile.id | Auth context (userId) |
| 5 | `stores/couponsStore.ts` | profile.id | Auth context (userId) |
| 6 | `stores/chatAttachmentStore.ts` | profile.id | Auth context (userId) |
| 7 | `stores/pushTokenStore.ts` | profile.id, profile.orbitId | Auth + orbit identity |
| 8 | `stores/propertyMediaStore.ts` | profile.id | Auth context (userId) |
| 9 | `stores/propertyManagementStore.ts` | profile.id, profile.orbitId | Auth + orbit identity |
| 10 | `stores/secureBookingActionsStore.ts` | profile.id | Auth context (userId) |
| 11 | `stores/secureRentActionsStore.ts` | profile.id | Auth context (userId) |

### Tier 2 — Components (migrate after stores)
| # | Consumer | Uses | Migration Target |
|---|----------|------|------------------|
| 12 | `components/system/AppInit.tsx` | loadProfile | orbit init hook |
| 13 | `components/guards/RoleGuard.tsx` | profile.role | orbit/ui.state or role hook |
| 14 | `components/communication-hub/HudChatPanel.tsx` | profile | orbit/thread.store |
| 15 | `components/booking/BookingStatusPanel.tsx` | profile | Auth context |
| 16 | `components/property/RentStatusPanel.tsx` | profile | Auth context |
| 17 | `components/property/OwnerPropertyDashboard.tsx` | profile | Auth context |
| 18 | `components/profile/AvatarUploader.tsx` | profile | orbit identity hook |

### Tier 3 — Pages (migrate last)
| # | Consumer | Uses | Migration Target |
|---|----------|------|------------------|
| 19 | `pages/OrbitIdentityPage.tsx` | profile | orbit identity hook |
| 20 | `pages/CustomerProfilePage.tsx` | profile | orbit identity hook |
| 21 | `pages/settings/SettingsHome.tsx` | profile | orbit identity hook |
| 22–27 | Other pages (RoleSwitcher, WalletPage, etc.) | profile.role, profile.id | Auth + role hook |

---

## Migration Order

1. **Phase A** — Create `useOrbitIdentity()` hook that reads from new orbit units
2. **Phase B** — Migrate Tier 1 stores (highest leverage: 11 files)
3. **Phase C** — Migrate Tier 2 components (7 files)
4. **Phase D** — Migrate Tier 3 pages (9 files)
5. **Phase E** — Verify zero imports of `orbitStore` and `chatStore`
6. **Phase F** — Delete both bridge files

## Removal Conditions (both bridges)

- [ ] Zero `import` statements reference the bridge file
- [ ] `grep -r "orbitStore\|chatStore" src/ --include="*.ts" --include="*.tsx"` returns 0 matches
- [ ] All tests pass
- [ ] E2E flows validated: login → profile load → messaging → booking
- [ ] Build clean (`tsc --noEmit`)
