import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { CATEGORY_TREE, type PrimaryCategory, type CategorySubcategory } from "@/lib/taxonomy/category-tree";

interface TaxonomyFinding {
  type: "duplicate_subcategory" | "missing_tags" | "empty_cluster" | "alias_conflict" | "orphan_cluster" | "weak_subcategory_count" | "missing_emoji";
  severity: "low" | "medium" | "high";
  category: string;
  detail: string;
  recommendation: string;
}

export class TaxonomyEngine extends BaseEngine {
  private findings: TaxonomyFinding[] = [];
  private score = 100;

  constructor() {
    super({
      id: "quality-taxonomy",
      name: "Taxonomy Quality Engine",
      category: "quality",
      intervalMs: 300_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: TaxonomyFinding[] = [];

    const globalSubValues = new Map<string, string[]>();
    const globalSubLabels = new Map<string, string[]>();

    for (const cat of CATEGORY_TREE) {
      if (cat.subcategories.length < 3) {
        findings.push({
          type: "weak_subcategory_count",
          severity: "medium",
          category: cat.key,
          detail: `"${cat.label}" has only ${cat.subcategories.length} subcategories`,
          recommendation: `Add more subcategories to "${cat.label}" for better discovery and search coverage`,
        });
      }

      const localValues = new Set<string>();
      const clusters = new Map<string, number>();

      for (const sub of cat.subcategories) {
        if (localValues.has(sub.value)) {
          findings.push({
            type: "duplicate_subcategory",
            severity: "high",
            category: cat.key,
            detail: `Duplicate subcategory value "${sub.value}" in "${cat.label}"`,
            recommendation: `Remove or rename duplicate "${sub.value}" in "${cat.label}"`,
          });
        }
        localValues.add(sub.value);

        if (!globalSubValues.has(sub.value)) globalSubValues.set(sub.value, []);
        globalSubValues.get(sub.value)!.push(cat.key);

        const labelKey = sub.label.toLowerCase().trim();
        if (!globalSubLabels.has(labelKey)) globalSubLabels.set(labelKey, []);
        globalSubLabels.get(labelKey)!.push(`${cat.key}/${sub.value}`);

        if (!sub.tags || sub.tags.length === 0) {
          findings.push({
            type: "missing_tags",
            severity: "low",
            category: cat.key,
            detail: `Subcategory "${sub.value}" in "${cat.label}" has no search tags`,
            recommendation: `Add tags to "${sub.value}" for better search discovery`,
          });
        }

        if (!sub.emoji || sub.emoji.trim() === "") {
          findings.push({
            type: "missing_emoji",
            severity: "low",
            category: cat.key,
            detail: `Subcategory "${sub.value}" has no emoji`,
            recommendation: `Add emoji to "${sub.value}" for UI display`,
          });
        }

        clusters.set(sub.cluster, (clusters.get(sub.cluster) || 0) + 1);
      }

      for (const [cluster, count] of clusters) {
        if (count === 1) {
          findings.push({
            type: "orphan_cluster",
            severity: "low",
            category: cat.key,
            detail: `Cluster "${cluster}" in "${cat.label}" has only 1 subcategory`,
            recommendation: `Consider merging "${cluster}" into another cluster or adding more subcategories`,
          });
        }
      }
    }

    for (const [value, categories] of globalSubValues) {
      if (categories.length > 1) {
        findings.push({
          type: "alias_conflict",
          severity: "high",
          category: categories.join(", "),
          detail: `Subcategory value "${value}" appears in multiple categories: ${categories.join(", ")}`,
          recommendation: `Disambiguate "${value}" — use unique values per category (e.g., "food_${value}", "grocery_${value}")`,
        });
      }
    }

    for (const [label, paths] of globalSubLabels) {
      if (paths.length > 1) {
        const values = paths.map(p => p.split("/")[1]);
        const uniqueValues = new Set(values);
        if (uniqueValues.size > 1) {
          findings.push({
            type: "alias_conflict",
            severity: "medium",
            category: "cross-category",
            detail: `Label "${label}" maps to different values: ${paths.join(", ")}`,
            recommendation: `Standardize label "${label}" across categories`,
          });
        }
      }
    }

    this.findings = findings;
    this.score = Math.max(0, 100 - findings.filter(f => f.severity === "high").length * 10 - findings.filter(f => f.severity === "medium").length * 3 - findings.filter(f => f.severity === "low").length);

    this.emit("report", {
      score: this.score,
      totalFindings: findings.length,
      high: findings.filter(f => f.severity === "high").length,
      medium: findings.filter(f => f.severity === "medium").length,
      low: findings.filter(f => f.severity === "low").length,
      totalCategories: CATEGORY_TREE.length,
      totalSubcategories: CATEGORY_TREE.reduce((s, c) => s + c.subcategories.length, 0),
    });

    return {
      level: findings.length > 0 ? "detect" : "observe",
      findings: findings.length,
      actions: [],
      duration: 0,
    };
  }

  getFindings() { return [...this.findings]; }
  getScore() { return this.score; }

  getReport() {
    return {
      score: this.score,
      totalCategories: CATEGORY_TREE.length,
      totalSubcategories: CATEGORY_TREE.reduce((s, c) => s + c.subcategories.length, 0),
      findings: this.findings,
      summary: {
        high: this.findings.filter(f => f.severity === "high").length,
        medium: this.findings.filter(f => f.severity === "medium").length,
        low: this.findings.filter(f => f.severity === "low").length,
      },
    };
  }
}
