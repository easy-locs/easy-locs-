import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { db } from "@/services/db";

interface ProfileFinding {
  type: "missing_field" | "weak_media" | "incomplete_location" | "missing_contact" | "low_completeness" | "stale_profile";
  severity: "low" | "medium" | "high";
  entityType: "shop" | "user" | "property";
  entityId?: string;
  detail: string;
  recommendation: string;
}

interface ProfileStats {
  totalProfiles: number;
  completeProfiles: number;
  avgCompleteness: number;
  missingPhotos: number;
  missingPhones: number;
  missingCategories: number;
  missingAddresses: number;
  missingHours: number;
}

export class ProfileQualityEngine extends BaseEngine {
  private findings: ProfileFinding[] = [];
  private stats: ProfileStats = { totalProfiles: 0, completeProfiles: 0, avgCompleteness: 0, missingPhotos: 0, missingPhones: 0, missingCategories: 0, missingAddresses: 0, missingHours: 0 };
  private score = 100;

  constructor() {
    super({
      id: "quality-profile",
      name: "Profile Quality Engine",
      category: "quality",
      intervalMs: 120_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: ProfileFinding[] = [];
    let totalProfiles = 0;
    let completeProfiles = 0;
    let totalCompleteness = 0;
    let missingPhotos = 0;
    let missingPhones = 0;
    let missingCategories = 0;
    let missingAddresses = 0;
    let missingHours = 0;

    try {
      const { data: shops } = await db("storefront_pages")
        .select("id, name, category, subcategory, phone, email, photo_url, cover_url, address_line, city, country, lat, lng, opening_hours, completeness_score, metadata_json, updated_at")
        .limit(500);

      if (shops && shops.length > 0) {
        totalProfiles = shops.length;

        for (const shop of shops) {
          let issues = 0;

          if (!shop.photo_url && !shop.cover_url) {
            missingPhotos++;
            issues++;
            findings.push({
              type: "weak_media",
              severity: "medium",
              entityType: "shop",
              entityId: shop.id,
              detail: `Shop "${shop.name || shop.id}" has no photos`,
              recommendation: "Add at least a logo and cover photo",
            });
          }

          if (!shop.phone && !shop.email) {
            missingPhones++;
            issues++;
            findings.push({
              type: "missing_contact",
              severity: "high",
              entityType: "shop",
              entityId: shop.id,
              detail: `Shop "${shop.name || shop.id}" has no phone or email`,
              recommendation: "Add at least one contact method",
            });
          }

          if (!shop.category && !shop.subcategory) {
            missingCategories++;
            issues++;
            findings.push({
              type: "missing_field",
              severity: "high",
              entityType: "shop",
              entityId: shop.id,
              detail: `Shop "${shop.name || shop.id}" has no category`,
              recommendation: "Assign a category from the canonical taxonomy",
            });
          }

          if (!shop.address_line || !shop.city || !shop.country) {
            missingAddresses++;
            issues++;
          }

          if (!shop.lat || !shop.lng) {
            findings.push({
              type: "incomplete_location",
              severity: "medium",
              entityType: "shop",
              entityId: shop.id,
              detail: `Shop "${shop.name || shop.id}" has no coordinates`,
              recommendation: "Geocode the address to get coordinates for Radar display",
            });
          }

          if (!shop.opening_hours) {
            missingHours++;
            issues++;
          }

          const completeness = shop.completeness_score || 0;
          totalCompleteness += completeness;
          if (completeness >= 70) completeProfiles++;

          if (completeness < 40) {
            findings.push({
              type: "low_completeness",
              severity: "high",
              entityType: "shop",
              entityId: shop.id,
              detail: `Shop "${shop.name || shop.id}" has very low completeness (${completeness}%)`,
              recommendation: "Complete the profile: add media, contact, hours, description",
            });
          }

          if (shop.updated_at) {
            const daysSince = (Date.now() - new Date(shop.updated_at).getTime()) / (86400000);
            if (daysSince > 180) {
              findings.push({
                type: "stale_profile",
                severity: "low",
                entityType: "shop",
                entityId: shop.id,
                detail: `Shop "${shop.name || shop.id}" not updated in ${Math.round(daysSince)} days`,
                recommendation: "Prompt the merchant to review and update their profile",
              });
            }
          }
        }
      }
    } catch (err) {
      this.log("warn", `Profile scan failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    this.stats = {
      totalProfiles,
      completeProfiles,
      avgCompleteness: totalProfiles > 0 ? Math.round(totalCompleteness / totalProfiles) : 0,
      missingPhotos,
      missingPhones,
      missingCategories,
      missingAddresses,
      missingHours,
    };

    const completionRate = totalProfiles > 0 ? completeProfiles / totalProfiles : 1;
    this.score = Math.round(completionRate * 100);
    this.findings = findings.slice(0, 200);

    this.emit("report", { score: this.score, totalFindings: findings.length, stats: this.stats });

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }

  getFindings() { return [...this.findings]; }
  getScore() { return this.score; }
  getStats() { return { ...this.stats }; }
  getReport() {
    return { score: this.score, stats: this.stats, findings: this.findings };
  }
}
