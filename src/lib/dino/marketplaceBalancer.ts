/**
 * DINO V6 — Marketplace Balancer
 * Detects supply/demand imbalances and suggests corrective actions.
 */

export interface CategorySupply {
  categoryId: string;
  categoryName: string;
  listingCount: number;
  activeListings: number;
  avgQuality: number;      // 0-100
  demandSignal: number;    // 0-1 based on search/click volume
  locationKey?: string;
}

export interface BalancerAction {
  type: "boost_category" | "recruit_pro" | "guide_existing" | "reduce_visibility" | "merge_categories";
  categoryId: string;
  categoryName: string;
  priority: "high" | "medium" | "low";
  description: string;
  metrics: { supply: number; demand: number; ratio: number };
}

export function analyzeMarketBalance(categories: CategorySupply[]): BalancerAction[] {
  const actions: BalancerAction[] = [];

  for (const cat of categories) {
    const ratio = cat.activeListings > 0 ? cat.demandSignal / (cat.activeListings / 100) : cat.demandSignal > 0 ? Infinity : 0;

    // High demand, low supply
    if (cat.demandSignal > 0.5 && cat.activeListings < 5) {
      actions.push({
        type: "recruit_pro",
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        priority: "high",
        description: `High demand for "${cat.categoryName}" but only ${cat.activeListings} active listings. Recruit professionals.`,
        metrics: { supply: cat.activeListings, demand: cat.demandSignal, ratio },
      });
    }

    // Moderate demand, low supply
    if (cat.demandSignal > 0.3 && cat.activeListings < 10) {
      actions.push({
        type: "boost_category",
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        priority: "medium",
        description: `Boost "${cat.categoryName}" to increase visibility — moderate demand with limited supply.`,
        metrics: { supply: cat.activeListings, demand: cat.demandSignal, ratio },
      });
    }

    // Oversaturated category (many listings, low demand)
    if (cat.activeListings > 50 && cat.demandSignal < 0.1) {
      actions.push({
        type: "reduce_visibility",
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        priority: "low",
        description: `"${cat.categoryName}" is oversaturated (${cat.activeListings} listings, low demand). Consider reducing prominence.`,
        metrics: { supply: cat.activeListings, demand: cat.demandSignal, ratio },
      });
    }

    // Low quality listings
    if (cat.avgQuality < 40 && cat.activeListings > 3) {
      actions.push({
        type: "guide_existing",
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        priority: "medium",
        description: `"${cat.categoryName}" has ${cat.activeListings} listings with low avg quality (${cat.avgQuality}/100). Guide pros to improve.`,
        metrics: { supply: cat.activeListings, demand: cat.demandSignal, ratio },
      });
    }
  }

  return actions.sort((a, b) => {
    const p = { high: 0, medium: 1, low: 2 };
    return p[a.priority] - p[b.priority];
  });
}
