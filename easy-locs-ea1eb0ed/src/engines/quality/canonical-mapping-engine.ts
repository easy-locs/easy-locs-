import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { CATEGORY_TREE } from "@/lib/taxonomy/category-tree";

interface MappingFinding {
  type: "missing_route" | "duplicate_vertical" | "architecture_mismatch" | "fulfillment_gap" | "capability_conflict" | "wallet_flow_missing" | "orbit_context_missing";
  severity: "low" | "medium" | "high";
  category: string;
  detail: string;
  recommendation: string;
}

export class CanonicalMappingEngine extends BaseEngine {
  private findings: MappingFinding[] = [];
  private score = 100;

  constructor() {
    super({
      id: "quality-canonical-mapping",
      name: "Canonical Mapping Engine",
      category: "quality",
      intervalMs: 300_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: MappingFinding[] = [];

    const verticalMap = new Map<string, string[]>();
    const routeMap = new Map<string, string[]>();

    for (const cat of CATEGORY_TREE) {
      if (!verticalMap.has(cat.vertical)) verticalMap.set(cat.vertical, []);
      verticalMap.get(cat.vertical)!.push(cat.key);

      if (!cat.route || cat.route.trim() === "") {
        findings.push({
          type: "missing_route",
          severity: "high",
          category: cat.key,
          detail: `Category "${cat.label}" has no canonical route`,
          recommendation: `Add a canonical route to "${cat.label}" in category-tree.ts`,
        });
      } else {
        if (!routeMap.has(cat.route)) routeMap.set(cat.route, []);
        routeMap.get(cat.route)!.push(cat.key);
      }

      if (cat.walletFlow === "none" && cat.fulfillment !== "none" && cat.fulfillment !== "property_listing") {
        findings.push({
          type: "wallet_flow_missing",
          severity: "medium",
          category: cat.key,
          detail: `"${cat.label}" has fulfillment (${cat.fulfillment}) but no wallet flow`,
          recommendation: `Add appropriate walletFlow to "${cat.label}"`,
        });
      }

      if (cat.orbitContext === "none" && cat.fulfillment !== "none") {
        findings.push({
          type: "orbit_context_missing",
          severity: "medium",
          category: cat.key,
          detail: `"${cat.label}" has fulfillment but no Orbit context for customer communication`,
          recommendation: `Add orbitContext to "${cat.label}" (order/booking/inquiry)`,
        });
      }

      const caps = cat.capabilities;
      if (caps.requires_menu && cat.architecture !== "menu") {
        findings.push({
          type: "capability_conflict",
          severity: "high",
          category: cat.key,
          detail: `"${cat.label}" requires_menu but architecture is "${cat.architecture}" (not menu)`,
          recommendation: `Fix architecture or capability flag mismatch`,
        });
      }
      if (caps.requires_rooms && cat.architecture !== "calendar_booking") {
        findings.push({
          type: "capability_conflict",
          severity: "high",
          category: cat.key,
          detail: `"${cat.label}" requires_rooms but architecture is "${cat.architecture}"`,
          recommendation: `Fix architecture or capability flag mismatch`,
        });
      }
      if (caps.can_delivery && cat.mobilityJobType === null && !["property_listing", "service_booking", "calendar_booking"].includes(cat.fulfillment)) {
        findings.push({
          type: "fulfillment_gap",
          severity: "medium",
          category: cat.key,
          detail: `"${cat.label}" supports delivery but has no mobilityJobType`,
          recommendation: `Add mobilityJobType for delivery dispatch`,
        });
      }
    }

    for (const [route, categories] of routeMap) {
      if (categories.length > 1) {
        findings.push({
          type: "duplicate_vertical",
          severity: "high",
          category: categories.join(", "),
          detail: `Route "${route}" shared by multiple categories: ${categories.join(", ")}`,
          recommendation: `Ensure each category has a unique canonical route`,
        });
      }
    }

    this.findings = findings;
    this.score = Math.max(0, 100 - findings.filter(f => f.severity === "high").length * 15 - findings.filter(f => f.severity === "medium").length * 5 - findings.filter(f => f.severity === "low").length * 2);

    this.emit("report", { score: this.score, totalFindings: findings.length });

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }

  getFindings() { return [...this.findings]; }
  getScore() { return this.score; }
  getReport() {
    return {
      score: this.score,
      findings: this.findings,
      summary: {
        high: this.findings.filter(f => f.severity === "high").length,
        medium: this.findings.filter(f => f.severity === "medium").length,
        low: this.findings.filter(f => f.severity === "low").length,
      },
    };
  }
}
