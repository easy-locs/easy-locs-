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

  it("engine-registry.ts imports GovernanceAuditEngine", () => {
    const content = readFile("engines/engine-registry.ts");
    expect(content).toContain("GovernanceAuditEngine");
    expect(content).toContain("governance-audit-engine");
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
// 13. DB schema type policy for PropertyListingV2 / BookingRecordV2
//     These are single canonical DB schema types (no V1 counterpart).
//     Policy: retain as-is (schema contract), document in registry.
// ──────────────────────────────────────────────────────────────

describe("Domain type V2 naming policy — single schema contract types", () => {
  it("PropertyListingV2 is a single canonical type in domain.ts (no PropertyListingV1 exists)", () => {
    const content = readFile("lib/types/domain.ts");
    expect(content).toContain("PropertyListingV2");
    expect(content).not.toContain("PropertyListingV1");
  });

  it("BookingRecordV2 is a single canonical type in domain.ts (no BookingRecordV1 exists)", () => {
    const content = readFile("lib/types/domain.ts");
    expect(content).toContain("BookingRecordV2");
    expect(content).not.toContain("BookingRecordV1");
  });

  it("canonical registry documents PropertyListingV2 as DB schema type (not versioned duplicate)", () => {
    const content = readFile("lib/canonical-version-registry.ts");
    expect(content).toContain("PropertyListingV2");
    expect(content).toContain("canonical DB schema type");
  });
});
