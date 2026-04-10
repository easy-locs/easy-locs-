import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { db } from "@/services/db";

interface MeBusinessFinding {
  type: "incomplete_business_profile" | "missing_analytics" | "weak_wallet_link" | "missing_orbit_link" | "stale_activity";
  severity: "low" | "medium" | "high";
  detail: string;
  recommendation: string;
}

export class MeBusinessEngine extends BaseEngine {
  private findings: MeBusinessFinding[] = [];
  private score = 100;

  constructor() {
    super({
      id: "quality-me-business",
      name: "Me Business Engine",
      category: "quality",
      intervalMs: 300_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: MeBusinessFinding[] = [];

    try {
      const { data: shops } = await db("storefront_pages")
        .select("id, name, owner_id, category, completeness_score, metadata_json")
        .limit(200);

      if (shops) {
        const ownerShopCount = new Map<string, number>();
        for (const shop of shops) {
          if (shop.owner_id) {
            ownerShopCount.set(shop.owner_id, (ownerShopCount.get(shop.owner_id) || 0) + 1);
          }

          if ((shop.completeness_score || 0) < 50) {
            findings.push({
              type: "incomplete_business_profile",
              severity: "medium",
              detail: `Business "${shop.name || shop.id}" has low completeness (${shop.completeness_score || 0}%)`,
              recommendation: "Guide merchant to complete their profile in Me > Business section",
            });
          }
        }
      }
    } catch {}

    const meSection = document.querySelector("[data-pillar='me']");
    if (meSection) {
      const walletLink = meSection.querySelector("[data-link-wallet], [href*='wallet']");
      if (!walletLink) {
        findings.push({
          type: "weak_wallet_link",
          severity: "medium",
          detail: "Me section has no visible wallet link",
          recommendation: "Add wallet summary card in Me for quick access",
        });
      }

      const orbitLink = meSection.querySelector("[data-link-orbit], [href*='orbit'], [href*='messages']");
      if (!orbitLink) {
        findings.push({
          type: "missing_orbit_link",
          severity: "medium",
          detail: "Me section has no visible Orbit link",
          recommendation: "Add Orbit identity/communication link in Me",
        });
      }
    }

    this.findings = findings;
    this.score = Math.max(0, 100 - findings.filter(f => f.severity === "high").length * 20 - findings.filter(f => f.severity === "medium").length * 5);

    this.emit("report", { score: this.score, totalFindings: findings.length });
    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }

  getFindings() { return [...this.findings]; }
  getScore() { return this.score; }
  getReport() { return { score: this.score, findings: this.findings }; }
}
