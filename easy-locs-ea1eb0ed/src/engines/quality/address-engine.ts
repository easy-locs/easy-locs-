import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { db } from "@/services/db";

interface AddressFinding {
  type: "missing_coordinates" | "missing_city" | "missing_country" | "incomplete_address" | "suspicious_coordinates" | "missing_postal";
  severity: "low" | "medium" | "high";
  entityId?: string;
  detail: string;
  recommendation: string;
}

interface AddressStats {
  totalAddresses: number;
  completeAddresses: number;
  withCoordinates: number;
  withCity: number;
  withCountry: number;
  qualityScore: number;
}

export class AddressEngine extends BaseEngine {
  private findings: AddressFinding[] = [];
  private stats: AddressStats = { totalAddresses: 0, completeAddresses: 0, withCoordinates: 0, withCity: 0, withCountry: 0, qualityScore: 0 };
  private score = 100;

  constructor() {
    super({
      id: "quality-address",
      name: "Address Quality Engine",
      category: "quality",
      intervalMs: 180_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: AddressFinding[] = [];
    let total = 0, complete = 0, withCoords = 0, withCity = 0, withCountry = 0;

    try {
      const { data: entities } = await db("storefront_pages")
        .select("id, name, address_line, city, country, postal_code, lat, lng")
        .limit(500);

      if (entities && entities.length > 0) {
        total = entities.length;

        for (const e of entities) {
          let isComplete = true;

          if (!e.lat || !e.lng) {
            findings.push({
              type: "missing_coordinates",
              severity: "high",
              entityId: e.id,
              detail: `"${e.name || e.id}" has no geocoordinates`,
              recommendation: "Geocode the address for Radar/map placement",
            });
            isComplete = false;
          } else {
            withCoords++;
            if (e.lat < -90 || e.lat > 90 || e.lng < -180 || e.lng > 180) {
              findings.push({
                type: "suspicious_coordinates",
                severity: "high",
                entityId: e.id,
                detail: `"${e.name || e.id}" has invalid coordinates (${e.lat}, ${e.lng})`,
                recommendation: "Re-geocode the address",
              });
            }
            if (e.lat === 0 && e.lng === 0) {
              findings.push({
                type: "suspicious_coordinates",
                severity: "high",
                entityId: e.id,
                detail: `"${e.name || e.id}" has null island coordinates (0,0)`,
                recommendation: "Re-geocode — likely a default/unfilled value",
              });
            }
          }

          if (!e.city) {
            findings.push({ type: "missing_city", severity: "medium", entityId: e.id, detail: `"${e.name || e.id}" has no city`, recommendation: "Add city for search and filtering" });
            isComplete = false;
          } else { withCity++; }

          if (!e.country) {
            findings.push({ type: "missing_country", severity: "medium", entityId: e.id, detail: `"${e.name || e.id}" has no country`, recommendation: "Add country for geo-routing" });
            isComplete = false;
          } else { withCountry++; }

          if (!e.address_line) {
            findings.push({ type: "incomplete_address", severity: "medium", entityId: e.id, detail: `"${e.name || e.id}" has no address line`, recommendation: "Add street address for delivery" });
            isComplete = false;
          }

          if (isComplete) complete++;
        }
      }
    } catch (err) {
      this.log("warn", `Address scan failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    this.score = total > 0 ? Math.round((complete / total) * 100) : 100;
    this.stats = { totalAddresses: total, completeAddresses: complete, withCoordinates: withCoords, withCity, withCountry, qualityScore: this.score };
    this.findings = findings.slice(0, 200);

    this.emit("report", { score: this.score, totalFindings: findings.length, stats: this.stats });
    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }

  getFindings() { return [...this.findings]; }
  getScore() { return this.score; }
  getStats() { return { ...this.stats }; }
  getReport() { return { score: this.score, stats: this.stats, findings: this.findings }; }
}
