/**
 * ARCHITECTURAL ENFORCEMENT TESTS
 * 
 * These tests verify the 40-point checklist is respected.
 * They scan the codebase structure and enforce canonical rules.
 * Run these on every CI build to prevent architectural drift.
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const SRC = path.resolve(__dirname, "../../src");

function readDir(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { recursive: true })
    .map(f => path.join(dir, f.toString()))
    .filter(f => fs.statSync(f).isFile());
}

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf-8");
}

function getTsxFiles(): string[] {
  return readDir(SRC).filter(f => f.endsWith(".tsx"));
}

function getTsFiles(): string[] {
  return readDir(SRC).filter(f => f.endsWith(".ts") || f.endsWith(".tsx"));
}

describe("Architecture Enforcement", () => {

  // ══════════════════════════════════════════════
  // RULE 2: No direct DB access from UI components
  // ══════════════════════════════════════════════
  describe("No supabase.from() in .tsx components", () => {
    it("should not have direct DB calls in UI components", () => {
      const violations: string[] = [];
      const allowedPaths = [
        "/integrations/", "/repositories/", "/lib/supabase/",
        "/families/", "/domains/", "/services/", "/test/",
      ];

      for (const file of getTsxFiles()) {
        const relPath = file.replace(SRC, "");
        if (allowedPaths.some(p => relPath.includes(p))) continue;
        
        const content = readFile(file);
        if (/supabase\s*\.\s*from\s*\(/.test(content)) {
          // Allow i18n.tsx as known exception
          if (!relPath.includes("i18n")) {
            violations.push(relPath);
          }
        }
      }

      expect(violations).toEqual([]);
    });
  });

  // ══════════════════════════════════════════════
  // RULE 5: Canonical types exist as SSOT
  // ══════════════════════════════════════════════
  describe("Canonical types SSOT", () => {
    it("canonical-types.ts exports CanonicalOrbitProfile", () => {
      const content = readFile(path.join(SRC, "domains/shared/canonical-types.ts"));
      expect(content).toContain("CanonicalOrbitProfile");
    });

    it("canonical-types.ts exports CanonicalWalletState", () => {
      const content = readFile(path.join(SRC, "domains/shared/canonical-types.ts"));
      expect(content).toContain("CanonicalWalletState");
    });

    it("canonical-types.ts exports CanonicalWalletTransaction", () => {
      const content = readFile(path.join(SRC, "domains/shared/canonical-types.ts"));
      expect(content).toContain("CanonicalWalletTransaction");
    });

    it("canonical-types.ts exports IdempotencyHeader", () => {
      const content = readFile(path.join(SRC, "domains/shared/canonical-types.ts"));
      expect(content).toContain("IdempotencyHeader");
      expect(content).toContain("requestId");
      expect(content).toContain("correlationId");
    });
  });

  // ══════════════════════════════════════════════
  // RULE 7: Single event bus
  // ══════════════════════════════════════════════
  describe("Single event bus", () => {
    it("platformBus is a singleton", () => {
      const content = readFile(path.join(SRC, "lib/shared/platform-bus.ts"));
      expect(content).toContain("export const platformBus");
    });

    it("canonical events file exists", () => {
      const content = readFile(path.join(SRC, "domains/shared/canonical-events.ts"));
      expect(content).toContain("CANONICAL_EVENTS");
    });
  });

  // ══════════════════════════════════════════════
  // RULE 17: State machines for critical flows
  // ══════════════════════════════════════════════
  describe("State machines exist for critical flows", () => {
    it("MESSAGE_MACHINE exists", () => {
      const content = readFile(path.join(SRC, "lib/state-machines/canonical-machines.ts"));
      expect(content).toContain("MESSAGE_MACHINE");
    });

    it("CALL_MACHINE exists", () => {
      const content = readFile(path.join(SRC, "lib/state-machines/canonical-machines.ts"));
      expect(content).toContain("CALL_MACHINE");
    });

    it("PAYMENT_MACHINE exists", () => {
      const content = readFile(path.join(SRC, "domains/shared/state-machines.ts"));
      expect(content).toContain("PAYMENT_MACHINE");
    });

    it("ORDER_MACHINE exists", () => {
      const content = readFile(path.join(SRC, "domains/shared/state-machines.ts"));
      expect(content).toContain("ORDER_MACHINE");
    });

    it("DRIVER_MACHINE exists", () => {
      const content = readFile(path.join(SRC, "domains/shared/state-machines.ts"));
      expect(content).toContain("DRIVER_MACHINE");
    });
  });

  // ══════════════════════════════════════════════
  // RULE 1: Domain SSOT boundaries
  // ══════════════════════════════════════════════
  describe("Domain boundaries", () => {
    it("Dashboard domain exists as read-only aggregator", () => {
      const content = readFile(path.join(SRC, "domains/dashboard/index.ts"));
      expect(content).toContain("read-only");
      expect(content).not.toContain("supabase.from");
    });

    it("Me domain exists", () => {
      expect(fs.existsSync(path.join(SRC, "domains/me/index.ts"))).toBe(true);
    });

    it("Radar domain exists", () => {
      expect(fs.existsSync(path.join(SRC, "domains/radar/index.ts"))).toBe(true);
    });

    it("Orbit domain exists", () => {
      expect(fs.existsSync(path.join(SRC, "domains/orbit/index.ts"))).toBe(true);
    });

    it("Wallet domain exists", () => {
      expect(fs.existsSync(path.join(SRC, "domains/wallet/service.ts"))).toBe(true);
    });
  });

  // ══════════════════════════════════════════════
  // RULE 26: Dependencies flow downward
  // ══════════════════════════════════════════════
  describe("Dependency direction", () => {
    it("canonical-types.ts has no domain imports", () => {
      const content = readFile(path.join(SRC, "domains/shared/canonical-types.ts"));
      expect(content).not.toContain("from \"@/stores/");
      expect(content).not.toContain("from \"@/hooks/");
      expect(content).not.toContain("from \"@/components/");
      expect(content).not.toContain("from \"@/pages/");
    });

    it("state-machines.ts only imports from canonical-machines", () => {
      const content = readFile(path.join(SRC, "domains/shared/state-machines.ts"));
      expect(content).not.toContain("from \"@/stores/");
      expect(content).not.toContain("from \"@/hooks/");
      expect(content).not.toContain("from \"@/components/");
    });
  });

  // ══════════════════════════════════════════════
  // RULE 34: No business logic in UI atoms
  // ══════════════════════════════════════════════
  describe("No business logic in UI atoms", () => {
    it("UI atoms should not import repositories", () => {
      const atomDir = path.join(SRC, "components/ui");
      if (!fs.existsSync(atomDir)) return;
      
      const violations: string[] = [];
      for (const file of readDir(atomDir)) {
        const content = readFile(file);
        if (content.includes("@/repositories/")) {
          violations.push(file.replace(SRC, ""));
        }
      }
      expect(violations).toEqual([]);
    });
  });
});
