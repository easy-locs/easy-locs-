/**
 * CANONICAL VERSION REGISTRY
 *
 * Single source of truth declaring, per domain:
 *   - The canonical store
 *   - The canonical service
 *   - The canonical types
 *   - The canonical pipeline
 *   - Legacy artifacts (shims kept for backward-compat, to be removed in next cleanup)
 *
 * This file MUST be updated whenever a store, service, or type is renamed or merged.
 * Guards in canonical-purity.test.ts enforce that legacy names do not reappear.
 */

export interface DomainCanonical {
  domain: string;
  store: string | null;
  service: string | null;
  types: string[];
  pipeline: string | null;
  legacyShims: string[];
  resolvedConflicts: string[];
}

export const CANONICAL_REGISTRY: DomainCanonical[] = [
  {
    domain: "auth",
    store: "@/stores/auth.store → useAuthStore",
    service: null,
    types: ["User", "Session (from @supabase/supabase-js)"],
    pipeline: "AuthContext → useAuthStore.syncFromAuth()",
    legacyShims: [],
    resolvedConflicts: [
      "auth_v1v2_unified: Merged dual-listener pattern into auth.store (useAuthStore). AuthContext is now the sole onAuthStateChange listener, synced via syncFromAuth(). Legacy auth shim file deleted.",
    ],
  },
  {
    domain: "orbit-profile",
    store: "@/stores/orbit-profile.internal → useOrbitProfileStore",
    service: "@/repositories/orbit-profile.repository",
    types: ["CanonicalOrbitProfile (from @/domains/shared/canonical-types)"],
    pipeline: "orbit-profile.repository → orbit-profile.internal",
    legacyShims: [],
    resolvedConflicts: [
      "orbit_store_consolidated: orbit-profile.internal.ts is canonical. Legacy profile shim file deleted. OrbitProfileV2 type alias removed. All consumers import from orbit-profile.internal directly.",
    ],
  },
  {
    domain: "orbit-messaging",
    store: "@/stores/orbit/ → useOrbitThreadStore, useOrbitUIState, etc.",
    service: "@/domains/orbit/services/orbit.services.ts",
    types: ["OrbitThreadState (from @/stores/orbit/thread.store)"],
    pipeline: "orbit realtime → stores/orbit/thread.store",
    legacyShims: [],
    resolvedConflicts: [],
  },
  {
    domain: "orbit-engine",
    store: "@/stores/orbit-engine/ → useOrbitEngine",
    service: null,
    types: ["OrbitModuleState, OrbitAlert, OrbitModule (from @/stores/orbit-engine/store-types)"],
    pipeline: "orbit-engine fetchers → useOrbitEngine",
    legacyShims: [],
    resolvedConflicts: [],
  },
  {
    domain: "notifications",
    store: "@/stores/notification.store → useNotificationStore",
    service: "@/lib/notification-service/notification-service",
    types: ["NotificationRow (from @/lib/notification-service/notification-service)"],
    pipeline: "notifications realtime → notification.store",
    legacyShims: [],
    resolvedConflicts: [
      "notification_v2_renamed: Store file deleted. useNotificationStore is the single canonical hook. All consumers migrated.",
      "notifications_service_renamed: lib/notification-service/ is the canonical service. No remaining v2 directory names.",
    ],
  },
  {
    domain: "listings",
    store: "@/stores/listingStore → useListingStore",
    service: "@/lib/db/repositories → listingRepo",
    types: ["PropertyListing (from @/domains/shared/canonical-types — renamed from PropertyListingV2; deprecated alias preserved)"],
    pipeline: "listingRepo → useListingStore",
    legacyShims: [],
    resolvedConflicts: [
      "store_dedup_listings: listingStore is a single unified store. No v1/v2 dual-read pattern.",
      "type_rename_PropertyListing: Renamed PropertyListingV2 → PropertyListing. Deprecated alias preserved.",
    ],
  },
  {
    domain: "bookings",
    store: "@/stores/bookingStore → useBookingStore",
    service: null,
    types: ["BookingRecord (from @/domains/shared/canonical-types — renamed from BookingRecordV2; deprecated alias preserved)"],
    pipeline: "useBookingStore → platformBus",
    legacyShims: [],
    resolvedConflicts: [
      "store_dedup_bookings: bookingStore is a single unified store. No v1/v2 dual-read pattern.",
      "type_rename_BookingRecord: Renamed BookingRecordV2 → BookingRecord. Deprecated alias preserved.",
    ],
  },
  {
    domain: "favorites",
    store: "@/stores/favoritesStore → useFavoritesStore",
    service: null,
    types: [],
    pipeline: "favorite_listings table → useFavoritesStore",
    legacyShims: [],
    resolvedConflicts: [
      "store_dedup_favorites: favoritesStore migrated to import useAuthStore from auth.store directly.",
    ],
  },
  {
    domain: "wallet",
    store: "@/stores/walletStore → useWalletStore",
    service: "@/lib/wallet/",
    types: ["WalletAccount, WalletTransaction (from @/domains/shared/canonical-types)"],
    pipeline: "wallet service → useWalletStore",
    legacyShims: [],
    resolvedConflicts: [],
  },
  {
    domain: "governance-engines",
    store: null,
    service: "@/engines/governance/flow-integrity-engine + governance-audit-engine",
    types: ["GovernanceViolation, ConflictLaw, RemediationAction (from governance-audit-engine)"],
    pipeline: "governance engines → platform-bus → UI engine reports",
    legacyShims: [
      "@/engines/governance/action-wiring-engine → re-exports FlowIntegrityEngine",
      "@/engines/governance/flow-closure-engine → re-exports FlowIntegrityEngine",
      "@/engines/governance/anti-conflict-engine → re-exports GovernanceAuditEngine",
      "@/engines/governance/auto-remediation-engine → re-exports GovernanceAuditEngine",
    ],
    resolvedConflicts: [
      "engine_merged_flow_integrity: action-wiring-engine + flow-closure-engine merged into flow-integrity-engine",
      "engine_merged_governance_audit: anti-conflict-engine + auto-remediation-engine merged into governance-audit-engine",
      "legacy_cleanup_deleted: services/legacy-cleanup/legacy-audit.ts removed (no callers, LegacyEntity no longer needed)",
    ],
  },
];

/**
 * Get the canonical store name for a given domain.
 */
export function getCanonicalStore(domain: string): string | null | undefined {
  return CANONICAL_REGISTRY.find((r) => r.domain === domain)?.store;
}

/**
 * Get all resolved conflict signatures.
 */
export function getAllResolvedConflicts(): string[] {
  return CANONICAL_REGISTRY.flatMap((r) => r.resolvedConflicts);
}

/**
 * Get all legacy shims that remain in the codebase.
 */
export function getLegacyShims(): { domain: string; shim: string }[] {
  return CANONICAL_REGISTRY.flatMap((r) =>
    r.legacyShims.map((shim) => ({ domain: r.domain, shim }))
  );
}
