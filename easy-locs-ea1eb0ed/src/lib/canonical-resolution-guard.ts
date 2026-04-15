/**
 * canonical-resolution-guard — Engine Memory integration for canonical v1/v2 resolutions.
 *
 * Responsibilities:
 * 1. Register resolved v1/v2 conflicts in Engine Memory so resolutions persist.
 * 2. Provide an active enforcement hook (warnIfDeprecatedReintroduced) that
 *    is called at runtime to detect and warn when deprecated patterns return.
 * 3. Export isKnownResolution() for test-time guard checks.
 *
 * Called once at app boot from bootEngineSystem() in engine-registry.ts.
 */
import { engineMemory } from "@/engines/core/engine-memory";
import { platformBus } from "@/lib/shared/platform-bus";

const CANONICAL_RESOLUTIONS = [
  {
    issueSignature: "auth_v1v2_unified",
    rootCause: "AuthContext (v1) and v2AuthStore coexisted with a markV1AuthActive()/syncFromV1() bridge, creating dual onAuthStateChange listeners and potential Web Locks contention.",
    fixApplied: "Merged v2AuthStore into auth.store.ts (useAuthStore). AuthContext is now the sole listener. auth.store is synced via syncFromAuth(). v2AuthStore.ts deleted.",
    fixFunction: "src/stores/auth.store.ts → useAuthStore",
    domain: "auth",
    category: "store_unification",
    bannedSymbols: ["markV1AuthActive", "syncFromV1", "useV2AuthStore"],
  },
  {
    issueSignature: "orbit_store_consolidated",
    rootCause: "orbitStore.ts (profile) and domains/orbit/stores/orbit.store.ts (messaging) both exported useOrbitStore, causing naming collisions. OrbitProfileV2 type alias implied a deprecated v1 existed.",
    fixApplied: "Created orbit-profile.internal.ts as canonical profile store. orbitStore.ts deleted. All consumers import from orbit-profile.internal. OrbitProfileV2 alias removed; use CanonicalOrbitProfile.",
    fixFunction: "src/stores/orbit-profile.internal.ts → useOrbitProfileStore",
    domain: "orbit",
    category: "store_unification",
    bannedSymbols: ["OrbitProfileV2"],
  },
  {
    issueSignature: "notification_v2_renamed",
    rootCause: "notificationV2Store.ts contained 'V2' in its name implying a V1 still existed. Interface was named NotificationV2State. Export was useNotificationV2Store.",
    fixApplied: "Created notification.store.ts with useNotificationStore and NotificationState. notificationV2Store.ts deleted. All consumers migrated to useNotificationStore.",
    fixFunction: "src/stores/notification.store.ts → useNotificationStore",
    domain: "notifications",
    category: "store_rename",
    bannedSymbols: ["useNotificationV2Store", "NotificationV2State"],
  },
  {
    issueSignature: "store_dedup_favorites",
    rootCause: "favoritesStore.ts imported useV2AuthStore from v2AuthStore.ts, creating indirect dependency on the deprecated dual-auth pattern.",
    fixApplied: "Updated favoritesStore.ts to import useAuthStore from auth.store.ts directly.",
    fixFunction: "src/stores/favoritesStore.ts → useAuthStore",
    domain: "favorites",
    category: "store_dedup",
    bannedSymbols: [],
  },
  {
    issueSignature: "store_dedup_analytics",
    rootCause: "analyticsStore.ts imported useV2AuthStore from v2AuthStore.ts.",
    fixApplied: "Updated analyticsStore.ts to import useAuthStore from auth.store.ts directly.",
    fixFunction: "src/stores/analyticsStore.ts → useAuthStore",
    domain: "analytics",
    category: "store_dedup",
    bannedSymbols: [],
  },
  {
    issueSignature: "store_dedup_saved_search",
    rootCause: "savedSearchStore.ts imported useV2AuthStore from v2AuthStore.ts.",
    fixApplied: "Updated savedSearchStore.ts to import useAuthStore from auth.store.ts directly.",
    fixFunction: "src/stores/savedSearchStore.ts → useAuthStore",
    domain: "search",
    category: "store_dedup",
    bannedSymbols: [],
  },
  {
    issueSignature: "engine_merged_flow_integrity",
    rootCause: "action-wiring-engine.ts and flow-closure-engine.ts were separate engines with overlapping concerns.",
    fixApplied: "Merged into flow-integrity-engine.ts (FlowIntegrityEngine). Old files are shims.",
    fixFunction: "src/engines/governance/flow-integrity-engine.ts → FlowIntegrityEngine",
    domain: "governance",
    category: "engine_merge",
    bannedSymbols: [],
  },
  {
    issueSignature: "engine_merged_governance_audit",
    rootCause: "anti-conflict-engine.ts and auto-remediation-engine.ts were separate engines with overlapping concerns.",
    fixApplied: "Merged into governance-audit-engine.ts (GovernanceAuditEngine). Old files are shims.",
    fixFunction: "src/engines/governance/governance-audit-engine.ts → GovernanceAuditEngine",
    domain: "governance",
    category: "engine_merge",
    bannedSymbols: [],
  },
  {
    issueSignature: "fn_dedup_insertChatMessage",
    rootCause: "insertChatMessageV2 was duplicated across communication.repository, rental.repository, and tenant-docs.repository.",
    fixApplied: "Renamed canonical to insertChatMessage in communication.repository. rental and tenant-docs re-export from communication.repository. V2 alias removed.",
    fixFunction: "src/repositories/communication.repository.ts → insertChatMessage",
    domain: "chat",
    category: "function_dedup",
    bannedSymbols: ["insertChatMessageV2"],
  },
  {
    issueSignature: "type_rename_PropertyListing",
    rootCause: "PropertyListingV2 implied a V1 counterpart that never existed. V2 suffix was DB schema naming drift.",
    fixApplied: "Renamed interface to PropertyListing. Deprecated type alias PropertyListingV2 preserved for backward compatibility.",
    fixFunction: "src/domains/shared/canonical-types.ts → PropertyListing",
    domain: "listings",
    category: "type_rename",
    bannedSymbols: [],
  },
  {
    issueSignature: "type_rename_BookingRecord",
    rootCause: "BookingRecordV2 implied a V1 counterpart that never existed. V2 suffix was DB schema naming drift.",
    fixApplied: "Renamed interface to BookingRecord. Deprecated type alias BookingRecordV2 preserved for backward compatibility.",
    fixFunction: "src/domains/shared/canonical-types.ts → BookingRecord",
    domain: "bookings",
    category: "type_rename",
    bannedSymbols: [],
  },
  {
    issueSignature: "file_rename_OrbitContactsPage",
    rootCause: "OrbitContactsPageV2.tsx had V2 suffix implying a deprecated V1 page that did not exist.",
    fixApplied: "Renamed to OrbitContactsPage.tsx. Updated imports in app-route-registry, smart-prefetch, and register-route-chunks.",
    fixFunction: "src/pages/OrbitContactsPage.tsx → OrbitContactsPage",
    domain: "orbit",
    category: "file_rename",
    bannedSymbols: ["OrbitContactsPageV2"],
  },
  {
    issueSignature: "v1_storefront_orphans_deleted",
    rootCause: "ReverseAuctionRFQ.tsx, PeerMarketplace.tsx, and DigitalProducts.tsx were orphaned ORBIT V1 storefront components with no route references.",
    fixApplied: "Deleted all three orphaned components.",
    fixFunction: "N/A — files deleted",
    domain: "storefront",
    category: "orphan_deletion",
    bannedSymbols: ["ReverseAuctionRFQ", "PeerMarketplace", "DigitalProducts"],
  },
  {
    issueSignature: "css_important_cleanup",
    rootCause: "Unnecessary !important overrides in index.css (search field padding, premium-selected, scroll-lock body), inline <style> tag in QrScannerPage.tsx, and fragmented CSS across multiple files.",
    fixApplied: "Removed !important from search-premium-field padding, premium-selected, and body[data-scroll-locked]. Moved QrScannerPage inline styles to index.css. Consolidated qr-scan-line.css, radar-pro.css, premium-payment-success.css, and performance.css into index.css. Deleted src/styles/ directory. Remaining !important are justified: third-party lib overrides, accessibility (reduced-motion), and performance mode.",
    fixFunction: "src/index.css (consolidated)",
    domain: "css",
    category: "css_cleanup",
    bannedSymbols: [],
  },
];

// ── Active Runtime Enforcement ────────────────────────────────────────────────

/**
 * Call this from any code path where a deprecated symbol is about to be used.
 * Emits a platform warning and records to engine memory if the symbol is banned.
 *
 * @example
 *   warnIfDeprecatedReintroduced("useNotificationV2Store", "orbit-engine/fetchers.ts");
 */
export function warnIfDeprecatedReintroduced(symbol: string, callerHint: string): void {
  const resolution = CANONICAL_RESOLUTIONS.find((r) =>
    r.bannedSymbols.includes(symbol)
  );
  if (!resolution) return;

  const message = `[canonical-guard] DEPRECATED SYMBOL REINTRODUCED: "${symbol}" in ${callerHint}. Resolved by: ${resolution.issueSignature}. Use: ${resolution.fixFunction}`;
  if (import.meta.env.DEV) {
    console.warn(message);
  }
  try {
    platformBus.emit("ui-engine:report", {
      engineId: "canonical-resolution-guard",
      severity: "warn",
      symbol, callerHint,
      issueSignature: resolution.issueSignature,
    });
  } catch {
    // platformBus failures must never block the call site
  }
}

// ── Engine Memory Registration ────────────────────────────────────────────────

let _registered = false;

/**
 * Register all canonical conflict resolutions in Engine Memory.
 * Idempotent — safe to call multiple times.
 */
export async function registerCanonicalResolutions(): Promise<void> {
  if (_registered) return;
  _registered = true;

  for (const resolution of CANONICAL_RESOLUTIONS) {
    try {
      await engineMemory.recordFix({
        type: "data",
        issueSignature: resolution.issueSignature,
        rootCause: resolution.rootCause,
        fixApplied: resolution.fixApplied,
        fixFunction: resolution.fixFunction,
        confidence: 1.0,
        domain: resolution.domain,
        category: resolution.category,
        engineId: "canonical-version-purge",
        ruleId: resolution.issueSignature,
        durationMs: 0,
      });
    } catch {
      // Non-blocking — engine memory failure must never block app boot
    }
  }
}

/**
 * Guard: check if a deprecated signature is known and resolved.
 * Returns true if the signature should NOT reappear.
 * Used in anti-regression tests.
 */
export function isKnownResolution(signature: string): boolean {
  return CANONICAL_RESOLUTIONS.some((r) => r.issueSignature === signature);
}

/**
 * Returns all banned symbols across all resolutions.
 * Used in anti-regression tests to verify symbols are not in live code.
 */
export function getAllBannedSymbols(): { symbol: string; issueSignature: string; replacement: string }[] {
  return CANONICAL_RESOLUTIONS.flatMap((r) =>
    r.bannedSymbols.map((sym) => ({
      symbol: sym,
      issueSignature: r.issueSignature,
      replacement: r.fixFunction,
    }))
  );
}
