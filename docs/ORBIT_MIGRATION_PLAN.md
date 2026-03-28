# Orbit Legacy Consumer Migration Plan

## Status: Phases A–D Complete

---

## Bridge: `chatStore.ts` (DEPRECATED)
**Active consumers: 2**

| # | Consumer | Uses | Migration Target | Priority |
|---|----------|------|------------------|----------|
| 1 | `src/stores/bookingStore.ts` | sendMessage, conversations | `orbit/thread.store` + `orbit/message.serializer` | P0 |
| 2 | `src/stores/propertyManagementStore.ts` | sendMessage | `orbit/thread.store` + `orbit/message.serializer` | P0 |

**Removal condition**: Zero imports remain → delete bridge file.

---

## Bridge: `orbitStore.ts` — Remaining consumers: 4

### Legitimate (infrastructure-level, not migratable)
| # | Consumer | Uses | Reason |
|---|----------|------|--------|
| 1 | `hooks/useOrbitIdentity.ts` | profile (reactive subscription) | **Foundation** — all consumers read through this |
| 2 | `components/system/AppInit.tsx` | loadProfile, clear | **Boot** — must call store actions directly |
| 3 | `stores/avatarStore.ts` | getState().profile, setState() | **Mutation** — needs store write access |
| 4 | `pages/OrbitIdentityPage.tsx` | profile, loading, loadProfile | **Admin page** — needs verificationLevel + loadProfile |

### Migrated (no longer importing orbitStore) ✅
| Tier | Files Migrated | Count |
|------|---------------|-------|
| Tier 1 — Stores | bookingStore, listingStore, analyticsStore, favoritesStore, couponsStore, chatAttachmentStore, pushTokenStore, propertyMediaStore, reviewsStore, savedSearchStore, activityLogStore, leaseDocumentsStore, avatarStore (partial) | 13 |
| Tier 2 — Components | RoleGuard, HudChatPanel, BookingStatusPanel, RentStatusPanel, OwnerPropertyDashboard, AvatarUploader, BookingList, AddContactByEmail | 8 |
| Tier 3 — Pages | SettingsHome, CustomerProfilePage, MeCommandCenter, HomePage | 4 |
| **Total migrated** | | **25** |

---

## Migration Order

1. ~~**Phase A** — Create `useOrbitIdentity()` hook~~ ✅
2. ~~**Phase B** — Migrate Tier 1 stores (13 files)~~ ✅
3. ~~**Phase C** — Migrate Tier 2 components (8 files)~~ ✅
4. ~~**Phase D** — Migrate Tier 3 pages (4 files)~~ ✅
5. **Phase E** — Verify zero non-essential imports of `orbitStore`
6. **Phase F** — Final bridge assessment (4 legitimate consumers remain)

## Current State

- `orbitStore.ts` reduced from **27 consumers → 4 legitimate infrastructure consumers**
- `chatStore.ts` still has **2 active consumers** pending orbit thread migration
- All 25 migrated files use `useOrbitIdentity()` hook exclusively

## Removal Conditions (orbitStore)

- [x] All UI consumers migrated to `useOrbitIdentity()`
- [x] All store consumers migrated to `getOrbitIdentity()` / `requireOrbitIdentity()`
- [ ] OrbitIdentityPage migrated (needs extended identity or dedicated hook)
- [ ] AppInit refactored to orbit init system
- [ ] avatarStore decoupled from direct store mutation
- [x] Build clean (`tsc --noEmit`)

## Removal Conditions (chatStore)

- [ ] bookingStore messaging migrated to orbit/thread.store
- [ ] propertyManagementStore messaging migrated to orbit/thread.store
- [ ] Zero `import` statements reference chatStore
- [ ] E2E flows validated: login → profile load → messaging → booking
