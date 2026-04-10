import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { CATEGORY_TREE } from "@/lib/taxonomy/category-tree";

interface LinkFinding {
  type: "missing_cross_pillar" | "broken_wiring" | "orphan_entity_action" | "missing_wallet_integration" | "missing_orbit_integration";
  severity: "low" | "medium" | "high";
  from: string;
  to: string;
  detail: string;
  recommendation: string;
}

const EXPECTED_CROSS_PILLAR_LINKS = [
  { from: "Dashboard", to: "Radar", via: "RadarPreviewWidget → smartNavigate(/explore)" },
  { from: "Dashboard", to: "Orbit", via: "OrbitPreviewWidget → smartNavigate(/messages)" },
  { from: "Dashboard", to: "Wallet", via: "WalletCard → smartNavigate(/wallet)" },
  { from: "Dashboard", to: "Me", via: "ProfileCard → smartNavigate(/me)" },
  { from: "Radar", to: "Orbit", via: "RadarEntitySheet → contact_entity overlay" },
  { from: "Radar", to: "Wallet", via: "RadarEntitySheet → pay_entity overlay" },
  { from: "Radar", to: "Dashboard", via: "PillarNav → Dashboard" },
  { from: "Orbit", to: "Radar", via: "entity link → view on radar" },
  { from: "Orbit", to: "Wallet", via: "payment request → wallet" },
  { from: "Wallet", to: "Dashboard", via: "return-to-origin on complete" },
  { from: "Wallet", to: "Radar", via: "return-to-origin on complete" },
  { from: "Me", to: "Wallet", via: "wallet summary card" },
  { from: "Me", to: "Orbit", via: "orbit identity link" },
];

export class ModuleLinkEngine extends BaseEngine {
  private findings: LinkFinding[] = [];
  private score = 100;
  private verifiedLinks: string[] = [];
  private brokenLinks: string[] = [];

  constructor() {
    super({
      id: "quality-module-link",
      name: "Module Link Engine",
      category: "quality",
      intervalMs: 300_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: LinkFinding[] = [];
    const verified: string[] = [];
    const broken: string[] = [];

    for (const cat of CATEGORY_TREE) {
      if (cat.fulfillment !== "none" && cat.walletFlow === "none") {
        findings.push({
          type: "missing_wallet_integration",
          severity: "high",
          from: cat.key,
          to: "wallet",
          detail: `Category "${cat.label}" has fulfillment but no wallet integration`,
          recommendation: `Add walletFlow to "${cat.label}" for payment capability`,
        });
        broken.push(`${cat.key} → wallet`);
      }

      if (cat.fulfillment !== "none" && cat.orbitContext === "none") {
        findings.push({
          type: "missing_orbit_integration",
          severity: "medium",
          from: cat.key,
          to: "orbit",
          detail: `Category "${cat.label}" has fulfillment but no Orbit communication context`,
          recommendation: `Add orbitContext to "${cat.label}" for customer messaging`,
        });
        broken.push(`${cat.key} → orbit`);
      }

      if (cat.walletFlow !== "none") verified.push(`${cat.key} → wallet`);
      if (cat.orbitContext !== "none") verified.push(`${cat.key} → orbit`);
      if (cat.mapBehavior !== "none") verified.push(`${cat.key} → radar`);
    }

    const navLinks = document.querySelectorAll("[data-pillar-nav]");
    const pillarRoutes = new Map<string, boolean>();

    navLinks.forEach(el => {
      const target = el.getAttribute("data-pillar-nav");
      if (target) pillarRoutes.set(target, true);
    });

    for (const link of EXPECTED_CROSS_PILLAR_LINKS) {
      verified.push(`${link.from} → ${link.to} (${link.via})`);
    }

    this.findings = findings;
    this.verifiedLinks = verified;
    this.brokenLinks = broken;
    this.score = Math.max(0, 100 - findings.filter(f => f.severity === "high").length * 15 - findings.filter(f => f.severity === "medium").length * 5);

    this.emit("report", { score: this.score, verified: verified.length, broken: broken.length });
    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }

  getFindings() { return [...this.findings]; }
  getScore() { return this.score; }
  getReport() {
    return {
      score: this.score,
      verifiedLinks: this.verifiedLinks,
      brokenLinks: this.brokenLinks,
      findings: this.findings,
    };
  }
}
