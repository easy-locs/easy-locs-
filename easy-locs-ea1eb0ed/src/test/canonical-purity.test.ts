/**
 * canonical-purity.test.ts
 *
 * Anti-regression tests verifying the canonical v1/v2 purge is complete and enforced:
 * 1. Canonical store files exist and export the right symbols.
 * 2. Legacy shim store files have been deleted.
 * 3. Key canonical stores import from canonical files only.
 * 4. Deprecated auth bridge functions are eliminated from all live code.
 * 5. OrbitProfileV2 is not in any live code.
 * 6. The canonical version registry is present and well-formed.
 * 7. The legacy-cleanup service has been deleted.
 * 8. Governance engine shims contain no business logic.
 * 9. Merged governance engines exist and export expected symbols.
 * 10. No store files have v1/v2 names.
 * 11. Banned symbols are not present in any live code (repo-wide scan).
 * 12. Engine registry registers FlowIntegrityEngine and GovernanceAuditEngine.
 */
import * as fs from "fs";
import * as path from "path";

const SRC = path.resolve(__dirname, "..");

function readFile(rel: string): string {
  const full = path.join(SRC, rel);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf-8") : "";
}

function fileExists(rel: string): boolean {
  return fs.existsSync(path.join(SRC, rel));
}

function listDir(rel: string): string[] {
  const full = path.join(SRC, rel);
  if (!fs.existsSync(full)) return [];
  return fs.readdirSync(full);
}

// ──────────────────────────────────────────────────────────────
// 1. Canonical store files exist
// ──────────────────────────────────────────────────────────────

describe("Canonical stores exist", () => {
  it("auth.store.ts exists and exports useAuthStore", () => {
    const content = readFile("stores/auth.store.ts");
    expect(content.length).toBeGreaterThan(0);
    expect(content).toContain("export const useAuthStore");
  });

  it("notification.store.ts exists and exports useNotificationStore", () => {
    const content = readFile("stores/notification.store.ts");
    expect(content.length).toBeGreaterThan(0);
    expect(content).toContain("export const useNotificationStore");
  });

  it("orbit-profile.internal.ts exists and exports useOrbitProfileStore", () => {
    const content = readFile("stores/orbit-profile.internal.ts");
    expect(content.length).toBeGreaterThan(0);
    expect(content).toContain("export const useOrbitProfileStore");
  });

  it("canonical-version-registry.ts exists", () => {
    expect(fileExists("lib/canonical-version-registry.ts")).toBe(true);
  });

  it("canonical-resolution-guard.ts exists", () => {
    expect(fileExists("lib/canonical-resolution-guard.ts")).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// 2. Legacy shim store files have been deleted
// ──────────────────────────────────────────────────────────────

describe("Legacy shim store files are deleted", () => {
  it("v2AuthStore.ts does not exist", () => {
    expect(fileExists("stores/v2AuthStore.ts")).toBe(false);
  });

  it("notificationV2Store.ts does not exist", () => {
    expect(fileExists("stores/notificationV2Store.ts")).toBe(false);
  });

  it("orbitStore.ts does not exist", () => {
    expect(fileExists("stores/orbitStore.ts")).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────
// 3. Key canonical stores use canonical imports only
// ──────────────────────────────────────────────────────────────

const DIRECT_CANONICAL_STORES = [
  "stores/favoritesStore.ts",
  "stores/analyticsStore.ts",
  "stores/savedSearchStore.ts",
  "components/system/AppInit.tsx",
];

describe("Key stores use canonical import paths", () => {
  for (const file of DIRECT_CANONICAL_STORES) {
    it(`${file} does not import from v2AuthStore`, () => {
      const content = readFile(file);
      expect(content).not.toContain("v2AuthStore");
    });

    it(`${file} does not import from notificationV2Store`, () => {
      const content = readFile(file);
      expect(content).not.toContain("notificationV2Store");
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 4. Deprecated auth bridge functions are eliminated
// ──────────────────────────────────────────────────────────────

describe("Deprecated auth bridge functions are eliminated", () => {
  it("AuthContext.tsx does not call markV1AuthActive()", () => {
    const content = readFile("contexts/AuthContext.tsx");
    expect(content).not.toContain("markV1AuthActive");
  });

  it("AuthContext.tsx does not call syncFromV1()", () => {
    const content = readFile("contexts/AuthContext.tsx");
    expect(content).not.toContain("syncFromV1(");
  });

  it("AppInit.tsx does not import from v2AuthStore", () => {
    const content = readFile("components/system/AppInit.tsx");
    expect(content).not.toContain("v2AuthStore");
  });
});

// ──────────────────────────────────────────────────────────────
// 5. OrbitProfileV2 is not in any live code
// ──────────────────────────────────────────────────────────────

describe("OrbitProfileV2 has been purged", () => {
  it("useOrbitIdentity.ts does not import OrbitProfileV2", () => {
    const content = readFile("hooks/useOrbitIdentity.ts");
    expect(content).not.toContain("OrbitProfileV2");
  });

  it("orbit-profile.internal.ts does not use OrbitProfileV2", () => {
    const content = readFile("stores/orbit-profile.internal.ts");
    expect(content).not.toContain("OrbitProfileV2");
  });
});

// ──────────────────────────────────────────────────────────────
// 6. Canonical registry integrity
// ──────────────────────────────────────────────────────────────

describe("Canonical version registry integrity", () => {
  it("declares auth domain with auth.store", () => {
    const content = readFile("lib/canonical-version-registry.ts");
    expect(content).toContain("auth.store");
    expect(content).toContain("useAuthStore");
  });

  it("declares notifications domain with notification.store", () => {
    const content = readFile("lib/canonical-version-registry.ts");
    expect(content).toContain("notification.store");
    expect(content).toContain("useNotificationStore");
  });

  it("declares orbit-profile domain with orbit-profile.internal", () => {
    const content = readFile("lib/canonical-version-registry.ts");
    expect(content).toContain("orbit-profile.internal");
    expect(content).toContain("useOrbitProfileStore");
  });

  it("has resolvedConflicts for all major migrations", () => {
    const content = readFile("lib/canonical-version-registry.ts");
    expect(content).toContain("auth_v1v2_unified");
    expect(content).toContain("orbit_store_consolidated");
    expect(content).toContain("notification_v2_renamed");
  });

  it("has no legacyShims for store domains (shims deleted)", () => {
    const content = readFile("lib/canonical-version-registry.ts");
    expect(content).not.toContain("notificationV2Store");
    expect(content).not.toContain("v2AuthStore");
    expect(content).not.toContain("orbitStore (re-exports");
  });
});

// ──────────────────────────────────────────────────────────────
// 7. Legacy cleanup service and notifications-v2 directory removed
// ──────────────────────────────────────────────────────────────

describe("Legacy files and directories have been removed", () => {
  it("services/legacy-cleanup/ directory does not exist", () => {
    expect(fileExists("services/legacy-cleanup")).toBe(false);
  });

  it("services/legacy-cleanup/legacy-audit.ts does not exist", () => {
    expect(fileExists("services/legacy-cleanup/legacy-audit.ts")).toBe(false);
  });

  it("lib/notifications-v2/ directory does not exist", () => {
    expect(fileExists("lib/notifications-v2")).toBe(false);
  });

  it("lib/notification-service/ directory exists (canonical service)", () => {
    expect(fileExists("lib/notification-service")).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// 8. Governance stubs deleted — shims no longer exist
// ──────────────────────────────────────────────────────────────

describe("Governance engine stubs deleted", () => {
  const deletedStubs = [
    "engines/governance/action-wiring-engine.ts",
    "engines/governance/flow-closure-engine.ts",
    "engines/governance/anti-conflict-engine.ts",
    "engines/governance/auto-remediation-engine.ts",
  ];

  for (const stub of deletedStubs) {
    it(`${stub} no longer exists`, () => {
      const fullPath = path.resolve(__dirname, "..", stub);
      expect(fs.existsSync(fullPath)).toBe(false);
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 9. Merged governance engines exist
// ──────────────────────────────────────────────────────────────

describe("Merged governance engines exist", () => {
  it("flow-integrity-engine.ts exists and exports FlowIntegrityEngine", () => {
    const content = readFile("engines/governance/flow-integrity-engine.ts");
    expect(content.length).toBeGreaterThan(0);
    expect(content).toContain("export class FlowIntegrityEngine");
    expect(content).toContain("registerAction");
    expect(content).toContain("registerFlow");
  });

  it("governance-audit-engine.ts exists and exports GovernanceAuditEngine", () => {
    const content = readFile("engines/governance/governance-audit-engine.ts");
    expect(content.length).toBeGreaterThan(0);
    expect(content).toContain("export class GovernanceAuditEngine");
    expect(content).toContain("attemptRemediation");
    expect(content).toContain("getAllGovernanceViolations");
  });
});

// ──────────────────────────────────────────────────────────────
// 10. No store files have v1/v2 names
// ──────────────────────────────────────────────────────────────

describe("Store naming conventions — zero v1/v2 suffixes", () => {
  it("No store file has 'v2' in its filename", () => {
    const storeFiles = listDir("stores");
    const v2Files = storeFiles.filter((f) => /v2/i.test(f));
    expect(v2Files).toEqual([]);
  });

  it("No store file has 'v1' in its filename", () => {
    const storeFiles = listDir("stores");
    const v1Files = storeFiles.filter((f) => /v1/i.test(f));
    expect(v1Files).toEqual([]);
  });

  it("auth.store.ts exports no V2 types", () => {
    const content = readFile("stores/auth.store.ts");
    expect(content).not.toMatch(/type\s+V2|interface\s+V2/);
  });

  it("notification.store.ts exports no V2 types", () => {
    const content = readFile("stores/notification.store.ts");
    expect(content).not.toMatch(/export.*interface.*V2|export.*type.*V2/);
  });
});

// ──────────────────────────────────────────────────────────────
// 11a. No imports from deleted store/service paths (repo-wide)
// ──────────────────────────────────────────────────────────────

describe("No imports from deleted file paths", () => {
  const DELETED_PATHS = [
    "@/stores/v2AuthStore",
    "@/stores/notificationV2Store",
    "@/stores/orbitStore",
    "@/lib/notifications-v2/",
  ];

  function findImportsOfPath(pathFragment: string): string[] {
    const srcRoot = path.resolve(__dirname, "..");
    const results: string[] = [];

    function walk(dir: string): void {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const fullPath = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (e.name === "node_modules" || e.name === ".git") continue;
          walk(fullPath);
          continue;
        }
        if (!e.name.endsWith(".ts") && !e.name.endsWith(".tsx")) continue;
        const rel = path.relative(srcRoot, fullPath);
        if (rel === "test/canonical-purity.test.ts") continue;
        const content = fs.readFileSync(fullPath, "utf-8");
        if (content.includes(pathFragment)) results.push(rel);
      }
    }

    walk(srcRoot);
    return results;
  }

  for (const deletedPath of DELETED_PATHS) {
    it(`No file imports from "${deletedPath}"`, () => {
      const found = findImportsOfPath(deletedPath);
      expect(found).toEqual([]);
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 11. Banned symbols not present in any live code (repo-wide)
// ──────────────────────────────────────────────────────────────

const EXEMPTED_FILES = new Set([
  "lib/canonical-resolution-guard.ts",
  "lib/canonical-version-registry.ts",
  "stores/auth.store.ts",
  "domains/shared/canonical-types.ts",
  "lib/types/booking.ts",
  "test/canonical-purity.test.ts",
]);

describe("Banned symbols not in any live code", () => {
  const bannedSymbols = [
    { symbol: "useNotificationV2Store", reason: "notification_v2_renamed" },
    { symbol: "NotificationV2State", reason: "notification_v2_renamed" },
    { symbol: "markV1AuthActive", reason: "auth_v1v2_unified" },
    { symbol: "syncFromV1(", reason: "auth_v1v2_unified" },
    { symbol: "useV2AuthStore", reason: "auth_v1v2_unified" },
    { symbol: "OrbitProfileV2", reason: "orbit_store_consolidated" },
    { symbol: "insertChatMessageV2", reason: "fn_dedup_insertChatMessage" },
    { symbol: "ReverseAuctionRFQ", reason: "v1_storefront_orphans_deleted" },
    { symbol: "PeerMarketplace", reason: "v1_storefront_orphans_deleted" },
    { symbol: "DigitalProducts", reason: "v1_storefront_orphans_deleted" },
  ];

  function findLiveUsages(symbol: string): string[] {
    const srcRoot = path.resolve(__dirname, "..");
    const results: string[] = [];

    function walk(dir: string): void {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const fullPath = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (e.name === "node_modules" || e.name === ".git") continue;
          walk(fullPath);
          continue;
        }
        if (!e.name.endsWith(".ts") && !e.name.endsWith(".tsx")) continue;
        const rel = path.relative(srcRoot, fullPath);
        if (EXEMPTED_FILES.has(rel)) continue;
        const content = fs.readFileSync(fullPath, "utf-8");
        if (content.includes(symbol)) results.push(rel);
      }
    }

    walk(srcRoot);
    return results;
  }

  for (const { symbol, reason } of bannedSymbols) {
    it(`"${symbol}" (banned by ${reason}) is absent from all live code`, () => {
      const found = findLiveUsages(symbol);
      expect(found).toEqual([]);
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 12. Engine registry registers merged governance engines
// ──────────────────────────────────────────────────────────────

describe("Engine registry includes merged governance engines", () => {
  it("engine-registry.ts imports FlowIntegrityEngine", () => {
    const content = readFile("engines/engine-registry.ts");
    expect(content).toContain("FlowIntegrityEngine");
    expect(content).toContain("flow-integrity-engine");
  });

  it("GovernanceAuditEngine is consolidated into ConsolidatedFlowIntegrityEngine", () => {
    const content = readFile("engines/consolidated/flow-integrity-engine.ts");
    expect(content).toContain("GovernanceAudit");
    const registryContent = readFile("engines/engine-registry.ts");
    expect(registryContent).toContain("ConsolidatedFlowIntegrityEngine");
  });

  it("engine-registry.ts calls registerCanonicalResolutions() at boot", () => {
    const content = readFile("engines/engine-registry.ts");
    expect(content).toContain("registerCanonicalResolutions");
  });

  it("canonical-resolution-guard.ts exports warnIfDeprecatedReintroduced", () => {
    const content = readFile("lib/canonical-resolution-guard.ts");
    expect(content).toContain("export function warnIfDeprecatedReintroduced");
  });

  it("canonical-resolution-guard.ts exports getAllBannedSymbols", () => {
    const content = readFile("lib/canonical-resolution-guard.ts");
    expect(content).toContain("export function getAllBannedSymbols");
  });

  it("governance engine signatures follow engine_merged_* pattern", () => {
    const content = readFile("lib/canonical-resolution-guard.ts");
    expect(content).toContain("engine_merged_flow_integrity");
    expect(content).toContain("engine_merged_governance_audit");
  });

  it("canonical registry governance signatures follow engine_merged_* pattern", () => {
    const content = readFile("lib/canonical-version-registry.ts");
    expect(content).toContain("engine_merged_flow_integrity");
    expect(content).toContain("engine_merged_governance_audit");
  });
});

// ──────────────────────────────────────────────────────────────
// 13. Type rename policy — PropertyListing / BookingRecord
//     Canonical interfaces renamed from V2 suffix. Deprecated aliases preserved.
// ──────────────────────────────────────────────────────────────

describe("Type rename policy — PropertyListing / BookingRecord", () => {
  it("PropertyListing is the canonical interface in canonical-types.ts", () => {
    const content = readFile("domains/shared/canonical-types.ts");
    expect(content).toContain("export interface PropertyListing");
    expect(content).not.toContain("PropertyListingV1");
  });

  it("BookingRecord is the canonical interface in canonical-types.ts", () => {
    const content = readFile("domains/shared/canonical-types.ts");
    expect(content).toContain("export interface BookingRecord");
    expect(content).not.toContain("BookingRecordV1");
  });

  it("deprecated PropertyListingV2 alias exists in canonical-types.ts", () => {
    const content = readFile("domains/shared/canonical-types.ts");
    expect(content).toContain("export type PropertyListingV2 = PropertyListing");
  });

  it("deprecated BookingRecordV2 alias exists in canonical-types.ts", () => {
    const content = readFile("domains/shared/canonical-types.ts");
    expect(content).toContain("export type BookingRecordV2 = BookingRecord");
  });

  it("canonical registry documents type renames", () => {
    const content = readFile("lib/canonical-version-registry.ts");
    expect(content).toContain("type_rename_PropertyListing");
    expect(content).toContain("type_rename_BookingRecord");
  });
});

// ──────────────────────────────────────────────────────────────
// 14. Function dedup — insertChatMessage
// ──────────────────────────────────────────────────────────────

describe("Function dedup — insertChatMessage", () => {
  it("communication.repository exports insertChatMessage as canonical name", () => {
    const content = readFile("repositories/communication.repository.ts");
    expect(content).toContain("export async function insertChatMessage");
  });

  it("rental.repository re-exports insertChatMessage from communication.repository", () => {
    const content = readFile("repositories/rental.repository.ts");
    expect(content).toContain('from "@/repositories/communication.repository"');
    expect(content).toContain("insertChatMessage");
  });

  it("tenant-docs.repository re-exports insertChatMessage from communication.repository", () => {
    const content = readFile("repositories/tenant-docs.repository.ts");
    expect(content).toContain('from "@/repositories/communication.repository"');
    expect(content).toContain("insertChatMessage");
  });

  it("resolution guard registers fn_dedup_insertChatMessage", () => {
    const content = readFile("lib/canonical-resolution-guard.ts");
    expect(content).toContain("fn_dedup_insertChatMessage");
  });
});

// ──────────────────────────────────────────────────────────────
// 15. File rename — OrbitContactsPage (no V2 suffix)
// ──────────────────────────────────────────────────────────────

describe("File rename — OrbitContactsPage", () => {
  it("OrbitContactsPage.tsx exists (no V2 suffix)", () => {
    expect(fileExists("pages/OrbitContactsPage.tsx")).toBe(true);
  });

  it("OrbitContactsPageV2.tsx is deleted", () => {
    expect(fileExists("pages/OrbitContactsPageV2.tsx")).toBe(false);
  });

  it("app-route-registry imports from OrbitContactsPage (not V2)", () => {
    const content = readFile("app/app-route-registry.tsx");
    expect(content).toContain("@/pages/OrbitContactsPage");
    expect(content).not.toContain("OrbitContactsPageV2");
  });

  it("resolution guard registers file_rename_OrbitContactsPage", () => {
    const content = readFile("lib/canonical-resolution-guard.ts");
    expect(content).toContain("file_rename_OrbitContactsPage");
  });
});

// ──────────────────────────────────────────────────────────────
// 16. Orphaned V1 storefront components deleted
// ──────────────────────────────────────────────────────────────

describe("Orphaned V1 storefront components deleted", () => {
  it("ReverseAuctionRFQ.tsx does not exist", () => {
    expect(fileExists("components/storefront/ReverseAuctionRFQ.tsx")).toBe(false);
  });

  it("PeerMarketplace.tsx does not exist", () => {
    expect(fileExists("components/storefront/PeerMarketplace.tsx")).toBe(false);
  });

  it("DigitalProducts.tsx does not exist", () => {
    expect(fileExists("components/storefront/DigitalProducts.tsx")).toBe(false);
  });

  it("resolution guard registers v1_storefront_orphans_deleted", () => {
    const content = readFile("lib/canonical-resolution-guard.ts");
    expect(content).toContain("v1_storefront_orphans_deleted");
  });
});

// ──────────────────────────────────────────────────────────────
// 17. CSS cleanup — no inline styles in QrScannerPage, reduced !important
// ──────────────────────────────────────────────────────────────

describe("CSS cleanup", () => {
  it("QrScannerPage.tsx has no inline <style> tag", () => {
    const content = readFile("pages/payments/QrScannerPage.tsx");
    expect(content).not.toContain("<style>");
  });

  it("index.css contains consolidated #qr-reader-region rules", () => {
    const content = readFile("index.css");
    expect(content).toContain("#qr-reader-region");
  });

  it("search-premium-field has no !important on padding", () => {
    const content = readFile("index.css");
    const searchBlock = content.split(".search-premium-field")[1]?.split("}")[0] ?? "";
    expect(searchBlock).not.toMatch(/padding.*!important/);
  });

  it("premium-selected has no !important", () => {
    const content = readFile("index.css");
    const block = content.split(".premium-selected")[1]?.split("}")[0] ?? "";
    expect(block).not.toContain("!important");
  });

  const DELETED_CSS_FILES = [
    "qr-scan-line.css",
    "radar-pro.css",
    "premium-payment-success.css",
    "performance.css",
  ];

  it("no component imports a deleted CSS file", () => {
    const srcDir = path.resolve(__dirname, "..");
    const violations: string[] = [];

    function walk(dir: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory() && !["node_modules", ".git", "test"].includes(entry.name)) {
          walk(path.join(dir, entry.name));
        } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
          const content = fs.readFileSync(path.join(dir, entry.name), "utf-8");
          for (const css of DELETED_CSS_FILES) {
            const importPattern = new RegExp(`import\\s+["'][^"']*${css.replace(".", "\\.")}["']`);
            if (importPattern.test(content)) {
              violations.push(`${entry.name} still imports deleted file: ${css}`);
            }
          }
        }
      }
    }

    walk(srcDir);
    expect(violations).toEqual([]);
  });

  it("body[data-scroll-locked] has no !important", () => {
    const content = readFile("index.css");
    const block = content.split("body[data-scroll-locked]")[1]?.split("}")[0] ?? "";
    expect(block).not.toContain("!important");
  });

  it("resolution guard registers css_important_cleanup", () => {
    const content = readFile("lib/canonical-resolution-guard.ts");
    expect(content).toContain("css_important_cleanup");
  });
});

// ──────────────────────────────────────────────────────────────
// 18. V2-suffix policy — no V2-suffixed types without V1 counterpart
// ──────────────────────────────────────────────────────────────

const V2_TYPE_ALLOWLIST = new Set([
  "PropertyListingV2",
  "BookingRecordV2",
  "CanonicalShopV2",
  "CanonicalContactV2",
  "SecureEnvelopeV2",
  "PLATFORM_EVENTS_V2",
  "AppNotificationRecordV2",
  "CallSessionV2",
  "CallSignalV2",
]);

describe("V2-suffix policy — no V2-suffixed exports in live code", () => {
  function findV2Exports(): { file: string; line: string }[] {
    const srcRoot = path.resolve(__dirname, "..");
    const results: { file: string; line: string }[] = [];

    function walk(dir: string): void {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const fullPath = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (e.name === "node_modules" || e.name === ".git" || e.name === "test") continue;
          walk(fullPath);
          continue;
        }
        if (!e.name.endsWith(".ts") && !e.name.endsWith(".tsx")) continue;
        const rel = path.relative(srcRoot, fullPath);
        if (EXEMPTED_FILES.has(rel)) continue;
        const content = fs.readFileSync(fullPath, "utf-8");
        for (const line of content.split("\n")) {
          const match = line.match(/export\s+(?:type|interface|function|const|class)\s+(\w+V2)\b/);
          if (match && !V2_TYPE_ALLOWLIST.has(match[1])) {
            results.push({ file: rel, line: line.trim() });
          }
        }
      }
    }

    walk(srcRoot);
    return results;
  }

  it("no V2-suffixed exports exist outside allowlist", () => {
    const found = findV2Exports();
    expect(found).toEqual([]);
  });
});

// ──────────────────────────────────────────────────────────────
// 19. Duplicate export detection across repositories
// ──────────────────────────────────────────────────────────────

describe("No duplicate function definitions across repositories", () => {
  it("insertChatMessage is only defined in communication.repository (others re-export)", () => {
    const canonical = readFile("repositories/communication.repository.ts");
    expect(canonical).toContain("export async function insertChatMessage");

    const rentalContent = readFile("repositories/rental.repository.ts");
    expect(rentalContent).not.toMatch(/export\s+async\s+function\s+insertChatMessage/);

    const tdContent = readFile("repositories/tenant-docs.repository.ts");
    expect(tdContent).not.toMatch(/export\s+async\s+function\s+insertChatMessage/);
  });

  function findDuplicateDefinitions(): { name: string; files: string[] }[] {
    const repoDir = path.join(SRC, "repositories");
    if (!fs.existsSync(repoDir)) return [];
    const definitionMap: Record<string, string[]> = {};

    function walkRepos(dir: string): void {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const fullPath = path.join(dir, e.name);
        if (e.isDirectory()) {
          walkRepos(fullPath);
          continue;
        }
        if (!e.name.endsWith(".ts")) continue;
        const rel = path.relative(SRC, fullPath);
        const content = fs.readFileSync(fullPath, "utf-8");
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const match = lines[i].match(/^export\s+async\s+function\s+(\w+)/);
          if (!match) continue;
          const fnName = match[1];
          const nextLines = lines.slice(i, i + 3).join(" ");
          const isReExport = nextLines.includes("return ") && nextLines.includes("(") && (i + 2 < lines.length && lines.slice(i, i + 5).join(" ").length < 300);
          if (!definitionMap[fnName]) definitionMap[fnName] = [];
          definitionMap[fnName].push(rel);
        }
      }
    }

    walkRepos(repoDir);

    return Object.entries(definitionMap)
      .filter(([, files]) => files.length > 1)
      .map(([name, files]) => ({ name, files }));
  }

  const BASELINE_DUPLICATE_COUNT = 131;

  it("duplicate function definition count does not increase above baseline", () => {
    const duplicates = findDuplicateDefinitions();
    expect(duplicates.length).toBeLessThanOrEqual(BASELINE_DUPLICATE_COUNT);
    if (duplicates.length < BASELINE_DUPLICATE_COUNT) {
      console.log(`[PURITY] Duplicate definitions decreased: ${duplicates.length} < baseline ${BASELINE_DUPLICATE_COUNT}. Update BASELINE_DUPLICATE_COUNT.`);
    }
  });

  const V2_FUNCTION_ALLOWLIST = new Set([
    "markCallAsMissedV2",
  ]);

  it("no V2-suffixed function definitions exist in repositories outside allowlist (zero tolerance)", () => {
    const repoDir = path.join(SRC, "repositories");
    if (!fs.existsSync(repoDir)) return;
    const violations: string[] = [];

    function walk(dir: string): void {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, e.name);
        if (e.isDirectory()) { walk(fullPath); continue; }
        if (!e.name.endsWith(".ts")) continue;
        const content = fs.readFileSync(fullPath, "utf-8");
        for (const line of content.split("\n")) {
          const match = line.match(/^export\s+(?:async\s+)?function\s+(\w+V2)\b/);
          if (match && !V2_FUNCTION_ALLOWLIST.has(match[1])) {
            violations.push(`${e.name}: ${match[1]}`);
          }
        }
      }
    }

    walk(repoDir);
    expect(violations).toEqual([]);
  });

  it("insertChatMessageV2 definition does not exist anywhere in repositories (zero tolerance)", () => {
    const repoDir = path.join(SRC, "repositories");
    if (!fs.existsSync(repoDir)) return;
    const violations: string[] = [];

    function walk(dir: string): void {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, e.name);
        if (e.isDirectory()) { walk(fullPath); continue; }
        if (!e.name.endsWith(".ts")) continue;
        const content = fs.readFileSync(fullPath, "utf-8");
        if (/insertChatMessageV2/.test(content)) {
          violations.push(e.name);
        }
      }
    }

    walk(repoDir);
    expect(violations).toEqual([]);
  });

  const KNOWN_CONFLICT_SYMBOLS = [
    "insertChatMessageV2",
    "OrbitContactsPageV2",
    "ReverseAuctionRFQ",
    "PeerMarketplace",
    "DigitalProducts",
  ];

  it("known conflict symbols are not exported from any source file", () => {
    const repoDir = path.resolve(__dirname, "..");
    const violations: string[] = [];

    function walk(dir: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory() && !["node_modules", ".git", "test"].includes(entry.name)) {
          walk(path.join(dir, entry.name));
        } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
          const content = fs.readFileSync(path.join(dir, entry.name), "utf-8");
          for (const sym of KNOWN_CONFLICT_SYMBOLS) {
            const exportPattern = new RegExp(`export\\s+(function|const|class|type|interface|enum)\\s+${sym}\\b`);
            if (exportPattern.test(content)) {
              violations.push(`${entry.name} exports banned symbol: ${sym}`);
            }
          }
        }
      }
    }

    walk(repoDir);
    expect(violations).toEqual([]);
  });
});

// ──────────────────────────────────────────────────────────────
// 20. CSS !important allowlist enforcement
// ──────────────────────────────────────────────────────────────

const IMPORTANT_ALLOWLIST_PATTERNS = [
  /prefers-reduced-motion/,
  /\.lightweight-mode/,
  /\[role="dialog"\]/,
  /\[data-vaul-drawer\]/,
  /\[data-sonner-toaster\]/,
  /\.pwa-install-hint/,
  /\.mobile-safe/,
  /font-size:\s*16px/,
  /#qr-reader-region/,
  /animation:\s*none/,
];

describe("CSS !important allowlist enforcement", () => {
  function findUnallowedImportant(cssFile: string): string[] {
    const content = readFile(cssFile);
    if (!content) return [];
    const lines = content.split("\n");
    const violations: string[] = [];
    const selectorStack: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const selectorMatch = line.match(/^([^{}]+)\{/);
      if (selectorMatch) {
        selectorStack.push(selectorMatch[1].trim());
      }

      if (line.includes("}")) {
        const closeBraces = (line.match(/\}/g) || []).length;
        for (let j = 0; j < closeBraces && selectorStack.length > 0; j++) {
          selectorStack.pop();
        }
      }

      if (line.includes("!important")) {
        const context = selectorStack.join(" ") + " " + line.trim();
        const isAllowed = IMPORTANT_ALLOWLIST_PATTERNS.some((p) => p.test(context));
        if (!isAllowed) {
          violations.push(`${cssFile}:${i + 1}: ${line.trim()} (context: ${selectorStack.join(" > ")})`);
        }
      }
    }

    return violations;
  }

  it("index.css has no unallowed !important declarations", () => {
    const violations = findUnallowedImportant("index.css");
    expect(violations).toEqual([]);
  });

  const EXPECTED_IMPORTANT_COUNT = 26;

  it("index.css !important count is at or below the audited ceiling", () => {
    const content = readFile("index.css");
    const matches = content.match(/!important/g) || [];
    expect(matches.length).toBeLessThanOrEqual(EXPECTED_IMPORTANT_COUNT);
    if (matches.length < EXPECTED_IMPORTANT_COUNT) {
      console.log(`[PURITY] !important count decreased: ${matches.length} < ceiling ${EXPECTED_IMPORTANT_COUNT}. Update EXPECTED_IMPORTANT_COUNT to ${matches.length}.`);
    }
  });

  it("every !important in index.css is covered by the allowlist", () => {
    const violations = findUnallowedImportant("index.css");
    expect(violations).toEqual([]);
  });

  it("consolidated CSS files (qr-scan-line, radar-pro, premium-payment-success, performance) no longer exist as separate files", () => {
    expect(fileExists("styles/qr-scan-line.css")).toBe(false);
    expect(fileExists("styles/radar-pro.css")).toBe(false);
    expect(fileExists("styles/premium-payment-success.css")).toBe(false);
    expect(fileExists("styles/performance.css")).toBe(false);
  });
});
