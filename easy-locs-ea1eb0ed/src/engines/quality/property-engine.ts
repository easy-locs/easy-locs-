import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { db } from "@/services/db";

interface PropertyFinding {
  type: "missing_listing_data" | "stale_listing" | "price_anomaly" | "missing_media" | "weak_location" | "document_gap";
  severity: "low" | "medium" | "high";
  detail: string;
  recommendation: string;
  count?: number;
}

export class PropertyEngine extends BaseEngine {
  private findings: PropertyFinding[] = [];
  private score = 100;

  constructor() {
    super({
      id: "quality-property",
      name: "Property Quality Engine",
      category: "quality",
      intervalMs: 300_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: PropertyFinding[] = [];

    try {
      const { data: listings } = await db("storefront_pages")
        .select("id, name, category, subcategory, photo_url, lat, lng, metadata_json, updated_at, completeness_score")
        .in("category", ["property", "real_estate"])
        .limit(200);

      if (listings && listings.length > 0) {
        let missingMedia = 0, weakLocation = 0, stale = 0, lowQuality = 0;

        for (const listing of listings) {
          if (!listing.photo_url) missingMedia++;
          if (!listing.lat || !listing.lng) weakLocation++;

          if (listing.updated_at) {
            const daysSince = (Date.now() - new Date(listing.updated_at).getTime()) / 86400000;
            if (daysSince > 90) stale++;
          }

          if ((listing.completeness_score || 0) < 40) lowQuality++;
        }

        if (missingMedia > 0) {
          findings.push({ type: "missing_media", severity: "high", detail: `${missingMedia} property listings without photos`, recommendation: "Photos are critical for property listings — add at least 3 photos", count: missingMedia });
        }
        if (weakLocation > 0) {
          findings.push({ type: "weak_location", severity: "high", detail: `${weakLocation} properties without coordinates`, recommendation: "Geocode property addresses for map display", count: weakLocation });
        }
        if (stale > 0) {
          findings.push({ type: "stale_listing", severity: "medium", detail: `${stale} property listings not updated in 90+ days`, recommendation: "Prompt owners to refresh listings or mark as inactive", count: stale });
        }
        if (lowQuality > 0) {
          findings.push({ type: "missing_listing_data", severity: "medium", detail: `${lowQuality} properties with completeness below 40%`, recommendation: "Guide property owners through profile completion", count: lowQuality });
        }
      }
    } catch {}

    this.findings = findings;
    this.score = Math.max(0, 100 - findings.filter(f => f.severity === "high").length * 15 - findings.filter(f => f.severity === "medium").length * 5);

    this.emit("report", { score: this.score, totalFindings: findings.length });
    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }

  getFindings() { return [...this.findings]; }
  getScore() { return this.score; }
  getReport() { return { score: this.score, findings: this.findings }; }
}
