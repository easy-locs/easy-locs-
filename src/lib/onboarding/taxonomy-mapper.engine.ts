/**
 * Taxonomy Mapper Engine — Maps canonical onboarding records to platform taxonomy.
 */
import type { CanonicalOnboardingRecord } from "./types";

export interface TaxonomyMappingResult {
  vertical: string;
  category: string | null;
  subcategory: string | null;
  tags: string[];
}

function norm(v?: string | null): string {
  return (v ?? "").trim().toLowerCase();
}

export function mapToCanonicalTaxonomy(
  record: CanonicalOnboardingRecord,
): TaxonomyMappingResult {
  const cats = record.categories.map(norm);
  const subs = record.subcategories.map(norm);

  if (record.vertical === "food") {
    if (cats.includes("restaurant") || cats.includes("pizza")) {
      return {
        vertical: "food",
        category: "restaurant",
        subcategory: subs.includes("pizza") ? "pizza" : "general_food",
        tags: [...record.categories, ...record.subcategories],
      };
    }
    return {
      vertical: "food",
      category: "restaurant",
      subcategory: "general_food",
      tags: [...record.categories, ...record.subcategories],
    };
  }

  if (record.vertical === "grocery") {
    return {
      vertical: "grocery",
      category: "grocery_store",
      subcategory: "general_grocery",
      tags: [...record.categories, ...record.subcategories],
    };
  }

  if (record.vertical === "hotel") {
    return {
      vertical: "stays",
      category: "hotel",
      subcategory: "hotel",
      tags: [...record.categories, ...record.subcategories],
    };
  }

  if (record.vertical === "services") {
    return {
      vertical: "services",
      category: record.categories[0] ?? "general_services",
      subcategory: record.subcategories[0] ?? null,
      tags: [...record.categories, ...record.subcategories],
    };
  }

  if (record.vertical === "property") {
    return {
      vertical: "property",
      category: "listing",
      subcategory: record.subcategories[0] ?? "general_property",
      tags: [...record.categories, ...record.subcategories],
    };
  }

  return {
    vertical: record.vertical,
    category: record.categories[0] ?? null,
    subcategory: record.subcategories[0] ?? null,
    tags: [...record.categories, ...record.subcategories],
  };
}
