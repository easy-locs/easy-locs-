# Orbit Legacy Consumer Migration Plan

## Status: Phases A–F Complete

---

## Bridge: `chatStore.ts` (READY FOR DELETION)
**Active consumers: 0** ✅

| # | Consumer | Status |
|---|----------|--------|
| 1 | `src/stores/bookingStore.ts` | ✅ Migrated to `orbit/thread.store` + `messageService.sendSystemMessage` |
| 2 | `src/stores/propertyManagementStore.ts` | ✅ Migrated to `orbit/thread.store` + `messageService.sendSystemMessage` |

**Removal condition**: ✅ Zero imports confirmed via `grep`. Safe to delete.

---

## Bridge: `orbitStore.ts` — Remaining consumers: 4 (infrastructure-level)

### Legitimate (infrastructure-level, not migratable)
| # | Consumer | Uses | Reason |
|---|----------|------|--------|
| 1 | `hooks/useOrbitIdentity.ts` | profile (reactive subscription) | **Foundation** — all consumers read through this |
| 2 | `components/system/AppInit.tsx` | loadProfile, clear | **Boot** — must call store actions directly |
| 3 | `stores/avatarStore.ts` | getState().profile, setState() | **Mutation** — needs store write access |
| 4 | `pages/OrbitIdentityPage.tsx` | profile, loading, loadProfile | **Admin page** — needs verificationLevel + loadProfile |

**Assessment**: These 4 consumers are **infrastructure-level** and should **remain** as legitimate orbitStore users. The store itself becomes the internal backing store for the identity system, accessed externally only through `useOrbitIdentity()`.

### Migrated (no longer importing orbitStore) ✅
| Tier | Files Migrated | Count |
|------|---------------|-------|
| Tier 1 — Stores | bookingStore, listingStore, analyticsStore, favoritesStore, couponsStore, chatAttachmentStore, pushTokenStore, propertyMediaStore, reviewsStore, savedSearchStore, activityLogStore, leaseDocumentsStore, avatarStore (partial) | 13 |
| Tier 2 — Components | RoleGuard, HudChatPanel, BookingStatusPanel, RentStatusPanel, OwnerPropertyDashboard, AvatarUploader, BookingList, AddContactByEmail | 8 |
| Tier 3 — Pages | SettingsHome, CustomerProfilePage, MeCommandCenter, HomePage | 4 |
| **Total migrated** | | **25** |

---

## Final Status

### chatStore.ts
- [x] bookingStore migrated to orbit/thread.store
- [x] propertyManagementStore migrated to orbit/thread.store
- [x] Zero `import` statements reference chatStore
- [x] Build clean (`tsc --noEmit`)
- **Action**: Delete `src/stores/chatStore.ts` when ready

### orbitStore.ts
- [x] All UI consumers migrated to `useOrbitIdentity()`
- [x] All store consumers migrated to `getOrbitIdentity()` / `requireOrbitIdentity()`
- [x] 4 infrastructure consumers confirmed as legitimate
- [x] Build clean (`tsc --noEmit`)
- **Action**: Retain as internal backing store. Rename to `orbit-profile.store.ts` if desired.

### New canonical APIs
| Need | Use |
|------|-----|
| Reactive profile in components | `useOrbitIdentity()` |
| Imperative profile in stores | `getOrbitIdentity()` |
| Auth-guarded profile | `requireOrbitIdentity()` |
| Create conversation thread | `useOrbitThreadStore.getState().createThread()` |
| Send text message | `sendTextMessage()` from `messageService` |
| Send system message | `sendSystemMessage()` from `messageService` |
| Send call record | `createCallSystemMessage()` from `messageService` |
