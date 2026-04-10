import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { db } from "@/services/db";

interface DataFinding {
  type: "null_critical" | "duplicate_entity" | "format_inconsistency" | "stale_data" | "orphan_record" | "schema_violation";
  severity: "low" | "medium" | "high";
  table: string;
  detail: string;
  recommendation: string;
  count?: number;
}

export class DataCleaningEngine extends BaseEngine {
  private findings: DataFinding[] = [];
  private score = 100;

  constructor() {
    super({
      id: "quality-data-cleaning",
      name: "Data Cleaning Engine",
      category: "quality",
      intervalMs: 300_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: DataFinding[] = [];

    try {
      const { data: nullNames } = await db("storefront_pages")
        .select("id")
        .or("name.is.null,name.eq.")
        .limit(100);

      if (nullNames && nullNames.length > 0) {
        findings.push({
          type: "null_critical",
          severity: "high",
          table: "storefront_pages",
          detail: `${nullNames.length} shops with null or empty name`,
          recommendation: "Fill missing names or mark for removal",
          count: nullNames.length,
        });
      }
    } catch {}

    try {
      const { data: noCategory } = await db("storefront_pages")
        .select("id")
        .is("category", null)
        .limit(100);

      if (noCategory && noCategory.length > 0) {
        findings.push({
          type: "null_critical",
          severity: "high",
          table: "storefront_pages",
          detail: `${noCategory.length} shops with null category`,
          recommendation: "Assign categories from canonical taxonomy",
          count: noCategory.length,
        });
      }
    } catch {}

    try {
      const { data: noCoords } = await db("storefront_pages")
        .select("id")
        .or("lat.is.null,lng.is.null")
        .limit(100);

      if (noCoords && noCoords.length > 0) {
        findings.push({
          type: "null_critical",
          severity: "medium",
          table: "storefront_pages",
          detail: `${noCoords.length} shops without geocoordinates`,
          recommendation: "Run geocoding pipeline for Radar placement",
          count: noCoords.length,
        });
      }
    } catch {}

    try {
      const { data: profiles } = await db("profiles")
        .select("id, display_name, email")
        .is("display_name", null)
        .limit(100);

      if (profiles && profiles.length > 0) {
        findings.push({
          type: "null_critical",
          severity: "medium",
          table: "profiles",
          detail: `${profiles.length} user profiles with null display_name`,
          recommendation: "Prompt users to set their display name",
          count: profiles.length,
        });
      }
    } catch {}

    try {
      const { data: walletOrphans } = await db("wallet_transactions")
        .select("id, status")
        .eq("status", "pending")
        .limit(100);

      if (walletOrphans && walletOrphans.length > 20) {
        findings.push({
          type: "stale_data",
          severity: "medium",
          table: "wallet_transactions",
          detail: `${walletOrphans.length} transactions stuck in pending state`,
          recommendation: "Review pending transactions for resolution or cleanup",
          count: walletOrphans.length,
        });
      }
    } catch {}

    this.findings = findings;
    const highCount = findings.filter(f => f.severity === "high").length;
    const medCount = findings.filter(f => f.severity === "medium").length;
    this.score = Math.max(0, 100 - highCount * 20 - medCount * 8);

    this.emit("report", { score: this.score, totalFindings: findings.length });
    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }

  getFindings() { return [...this.findings]; }
  getScore() { return this.score; }
  getReport() { return { score: this.score, findings: this.findings }; }
}
