import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import {
  isCanonicalVertical,
  toViolationVertical,
  type CanonicalCategoryNode,
  type GovernanceViolation,
  type MediaAssetType,
} from "@/domains/shared/canonical-types";
import { persistViolation } from "@/services/governance/violation-persistence";
import { CATEGORY_TREE } from "@/lib/taxonomy/category-tree";

const categoryNodeCache = new Map<string, CanonicalCategoryNode>();
const taxonomyViolations: GovernanceViolation[] = [];

function buildNodeKey(vertical: string, category: string, sub: string | null): string {
  return `${vertical}::${category}::${sub ?? "*"}`;
}

function initCache(): void {
  if (categoryNodeCache.size > 0) return;
  for (const primary of CATEGORY_TREE) {
    if (!isCanonicalVertical(primary.vertical)) continue;
    const baseNode: CanonicalCategoryNode = {
      vertical: primary.vertical,
      category: primary.key,
      subcategory: null,
      allowedMediaTypes: ["image", "video"] as MediaAssetType[],
      allowedCardTemplates: [primary.architecture],
      allowedCTAFamilies: [primary.walletFlow],
      allowedSearchFacets: primary.subcategories.map((s) => s.cluster),
      allowedBannerContexts: [primary.key],
      allowedLocaleVariants: [],
    };
    categoryNodeCache.set(
      buildNodeKey(primary.vertical, primary.key, null),
      baseNode
    );

    for (const sub of primary.subcategories) {
      const subNode: CanonicalCategoryNode = {
        ...baseNode,
        subcategory: sub.value,
        allowedSearchFacets: [sub.cluster, ...(sub.tags ?? [])],
      };
      categoryNodeCache.set(
        buildNodeKey(primary.vertical, primary.key, sub.value),
        subNode
      );
    }
  }
}

export function validateTaxonomy(
  vertical: string,
  category: string,
  subcategory: string | null
): { valid: boolean; node: CanonicalCategoryNode | null; violation: GovernanceViolation | null } {
  initCache();

  const key = buildNodeKey(vertical, category, subcategory);
  const node = categoryNodeCache.get(key);

  if (node) {
    return { valid: true, node, violation: null };
  }

  const categoryKey = buildNodeKey(vertical, category, null);
  const parentNode = categoryNodeCache.get(categoryKey);

  if (!parentNode) {
    const v: GovernanceViolation = {
      id: `tax-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "invalid_category",
      severity: "error",
      source: `taxonomy:${vertical}/${category}`,
      target: `validation`,
      message: `Category "${category}" not found in vertical "${vertical}"`,
      ownerDomain: vertical,
      vertical: toViolationVertical(vertical),
      detectedAt: new Date().toISOString(),
      resolvedAt: null,
      autoRemediated: false,
      metadata: { vertical, category, subcategory },
      engine: "taxonomy-governance",
      code: "CATEGORY_NOT_FOUND",
      dedupKey: `tax:${vertical}:${category}`,
      status: "new",
    };
    taxonomyViolations.push(v);
    persistViolation(v);
    return { valid: false, node: null, violation: v };
  }

  if (subcategory) {
    const v: GovernanceViolation = {
      id: `tax-sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "invalid_category",
      severity: "warning",
      source: `taxonomy:${vertical}/${category}/${subcategory}`,
      target: `validation`,
      message: `Subcategory "${subcategory}" not found in category "${category}"`,
      ownerDomain: vertical,
      vertical: toViolationVertical(vertical),
      detectedAt: new Date().toISOString(),
      resolvedAt: null,
      autoRemediated: false,
      metadata: { vertical, category, subcategory },
      engine: "taxonomy-governance",
      code: "SUBCATEGORY_NOT_FOUND",
      dedupKey: `tax:${vertical}:${category}:${subcategory}`,
      status: "new",
    };
    taxonomyViolations.push(v);
    persistViolation(v);
    return { valid: false, node: parentNode, violation: v };
  }

  return { valid: true, node: parentNode, violation: null };
}

export function getCategoryNode(
  vertical: string,
  category: string,
  subcategory?: string | null
): CanonicalCategoryNode | null {
  initCache();
  return categoryNodeCache.get(
    buildNodeKey(vertical, category, subcategory ?? null)
  ) ?? null;
}

export function getTaxonomyViolations(): GovernanceViolation[] {
  return [...taxonomyViolations];
}

export function getAllCategoryNodes(): CanonicalCategoryNode[] {
  initCache();
  return Array.from(categoryNodeCache.values());
}

export class TaxonomyGovernanceEngine extends BaseEngine {
  constructor() {
    super({
      id: "taxonomy-governance",
      name: "Taxonomy Governance Engine",
      category: "governance",
      intervalMs: 60_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    initCache();

    const recent = taxonomyViolations.filter(
      (v) => Date.now() - new Date(v.detectedAt).getTime() < this.intervalMs
    );

    return {
      level: recent.length > 0 ? "detect" : "observe",
      findings: recent.length,
      actions: recent
        .filter((v) => v.severity === "error")
        .map((v) => `REJECT: ${v.message}`),
      duration: 0,
    };
  }
}
