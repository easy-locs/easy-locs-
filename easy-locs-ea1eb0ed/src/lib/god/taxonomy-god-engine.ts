export type TaxonomyFamily =
  | "FOOD"
  | "SERVICE"
  | "HOTEL"
  | "REAL_ESTATE"
  | "TRANSPORT"
  | "DELIVERY"
  | "HEALTH"
  | "SHOP"
  | "FINANCE"
  | "MEDIA"
  | "TRAVEL"
  | "ADMIN"
  | "SYSTEM";

export interface TaxonomyNode {
  path: string;
  family: TaxonomyFamily;
  level: number;
  label: string;
  parent: string | null;
  children: string[];
  aliases: string[];
  rules: TaxonomyRule[];
}

export interface TaxonomyRule {
  id: string;
  description: string;
  check: (path: string) => boolean;
}

export interface TaxonomyValidationResult {
  valid: boolean;
  path: string;
  errors: string[];
  warnings: string[];
  suggested_path?: string;
}

export interface TaxonomyConflict {
  type: "duplicate" | "alias_collision" | "path_collision" | "cross_family";
  path_a: string;
  path_b: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  auto_fixable: boolean;
  suggested_fix?: string;
}

const CANONICAL_TAXONOMY: Record<string, string[]> = {
  "GLOBAL": ["FOOD", "SERVICE", "HOTEL", "REAL_ESTATE", "TRANSPORT", "DELIVERY", "HEALTH", "SHOP", "FINANCE", "MEDIA", "TRAVEL", "ADMIN", "SYSTEM"],

  "GLOBAL.FOOD": ["RESTAURANT", "CLOUD_KITCHEN", "DELIVERY_KITCHEN", "GROCERY_FOOD", "BAKERY", "DRINKS"],
  "GLOBAL.FOOD.RESTAURANT": ["ITALIAN", "JAPANESE", "CHINESE", "INDIAN", "FRENCH", "THAI", "MEXICAN", "AMERICAN", "FAST_FOOD", "PIZZA", "HEALTHY", "SEAFOOD", "STEAKHOUSE", "VEGETARIAN", "VEGAN", "HALAL", "BUFFET", "FINE_DINING", "CASUAL_DINING", "BREAKFAST", "BRUNCH", "CATERING", "FOOD_COURT"],
  "GLOBAL.FOOD.RESTAURANT.PIZZA": ["NEAPOLITAN", "NEW_YORK_STYLE", "DEEP_DISH", "SICILIAN", "WOOD_FIRED"],
  "GLOBAL.FOOD.CLOUD_KITCHEN": ["SINGLE_BRAND", "MULTI_BRAND", "GHOST_KITCHEN"],
  "GLOBAL.FOOD.BAKERY": ["PASTRY", "BREAD", "CAKE", "CONFECTIONERY"],
  "GLOBAL.FOOD.DRINKS": ["COFFEE", "TEA", "JUICE", "SMOOTHIE", "BUBBLE_TEA", "BAR"],

  "GLOBAL.SERVICE": ["HOME_SERVICE", "PERSONAL_SERVICE", "PROFESSIONAL_SERVICE", "BUSINESS_SERVICE", "EMERGENCY_SERVICE"],
  "GLOBAL.SERVICE.HOME_SERVICE": ["PLUMBING", "ELECTRICIAN", "AC_REPAIR", "CLEANING", "PAINTING", "CARPENTRY", "PEST_CONTROL", "GARDENING", "LOCKSMITH", "HANDYMAN"],
  "GLOBAL.SERVICE.HOME_SERVICE.PLUMBING": ["EMERGENCY", "INSTALLATION", "REPAIR", "MAINTENANCE"],
  "GLOBAL.SERVICE.PERSONAL_SERVICE": ["BEAUTY", "BARBER", "SPA", "MASSAGE", "TATTOO", "NAIL_SALON", "TAILOR"],
  "GLOBAL.SERVICE.PROFESSIONAL_SERVICE": ["LEGAL", "ACCOUNTING", "CONSULTING", "TUTORING", "TRANSLATION", "PHOTOGRAPHY", "EVENT_PLANNING"],
  "GLOBAL.SERVICE.BUSINESS_SERVICE": ["LOGISTICS", "CATERING_SERVICE", "IT_SUPPORT", "SECURITY"],
  "GLOBAL.SERVICE.EMERGENCY_SERVICE": ["PLUMBING_EMERGENCY", "ELECTRICIAN_EMERGENCY", "LOCKSMITH_EMERGENCY", "GLASS_REPAIR"],

  "GLOBAL.HOTEL": ["HOTEL", "APARTHOTEL", "RESORT", "SHORT_STAY", "LONG_STAY", "HOSTEL", "GUESTHOUSE"],
  "GLOBAL.HOTEL.HOTEL": ["LUXURY", "BUSINESS", "BUDGET", "BOUTIQUE", "CHAIN"],
  "GLOBAL.HOTEL.RESORT": ["BEACH", "MOUNTAIN", "SPA_RESORT", "GOLF", "ALL_INCLUSIVE"],
  "GLOBAL.HOTEL.SHORT_STAY": ["DAILY", "WEEKEND", "TRANSIT"],

  "GLOBAL.REAL_ESTATE": ["RENT", "SALE", "PROPERTY_MANAGEMENT", "COMMERCIAL", "LAND"],
  "GLOBAL.REAL_ESTATE.RENT": ["APARTMENT", "VILLA", "STUDIO", "OFFICE", "SHARED_ROOM", "PENTHOUSE"],
  "GLOBAL.REAL_ESTATE.SALE": ["APARTMENT", "VILLA", "TOWNHOUSE", "PENTHOUSE", "LAND_PLOT"],
  "GLOBAL.REAL_ESTATE.COMMERCIAL": ["OFFICE_SPACE", "RETAIL_SPACE", "WAREHOUSE", "COWORKING"],
  "GLOBAL.REAL_ESTATE.PROPERTY_MANAGEMENT": ["RESIDENTIAL", "COMMERCIAL_PM", "VACATION_RENTAL"],

  "GLOBAL.TRANSPORT": ["TAXI", "RIDE_HAILING", "DRIVER", "AIRPORT_TRANSFER", "CHAUFFEUR"],
  "GLOBAL.TRANSPORT.TAXI": ["STANDARD", "PREMIUM", "VAN", "ACCESSIBLE"],
  "GLOBAL.TRANSPORT.AIRPORT_TRANSFER": ["ARRIVAL", "DEPARTURE", "ROUND_TRIP"],

  "GLOBAL.DELIVERY": ["FOOD_DELIVERY", "PARCEL_DELIVERY", "COURIER", "RIDER", "GROCERY_DELIVERY"],
  "GLOBAL.DELIVERY.FOOD_DELIVERY": ["EXPRESS", "SCHEDULED", "CATERING_DELIVERY"],
  "GLOBAL.DELIVERY.PARCEL_DELIVERY": ["SAME_DAY", "NEXT_DAY", "STANDARD", "FRAGILE"],
  "GLOBAL.DELIVERY.COURIER": ["DOCUMENT", "PACKAGE", "HEAVY"],

  "GLOBAL.HEALTH": ["HOSPITAL", "PHARMACY", "CLINIC", "LAB", "VETERINARY", "DENTIST", "OPTICIAN"],
  "GLOBAL.HEALTH.PHARMACY": ["RETAIL_24H", "ONLINE", "SPECIALTY"],
  "GLOBAL.HEALTH.CLINIC": ["GENERAL", "SPECIALIST", "URGENT_CARE"],
  "GLOBAL.HEALTH.HOSPITAL": ["GENERAL_HOSPITAL", "SPECIALTY_HOSPITAL", "MATERNITY"],

  "GLOBAL.SHOP": ["GROCERY", "PET_SHOP", "RETAIL", "ATM", "CONVENIENCE", "ELECTRONICS", "FASHION", "HOME_DECOR"],
  "GLOBAL.SHOP.GROCERY": ["ORGANIC", "HALAL", "IMPORTED", "LOCAL", "MINI_MARKET", "SUPERMARKET"],
  "GLOBAL.SHOP.ELECTRONICS": ["PHONES", "COMPUTERS", "ACCESSORIES", "REPAIR"],
  "GLOBAL.SHOP.FASHION": ["MEN", "WOMEN", "KIDS", "LUXURY_FASHION", "SPORTS"],
  "GLOBAL.SHOP.PET_SHOP": ["FOOD_PET", "ACCESSORIES_PET", "GROOMING", "VET_SUPPLIES"],

  "GLOBAL.FINANCE": ["BANK", "EXCHANGE", "INSURANCE", "CRYPTO", "REMITTANCE"],

  "GLOBAL.MEDIA": ["VIDEO", "PICTURE", "BANNER", "AD", "STORY", "PROMO", "MENU_MEDIA"],
  "GLOBAL.MEDIA.BANNER": ["PROMO_BANNER", "HOMEPAGE_BANNER", "VERTICAL_BANNER", "SEASONAL"],
  "GLOBAL.MEDIA.AD": ["SPONSORED", "NATIVE", "DISPLAY", "VIDEO_AD"],

  "GLOBAL.TRAVEL": ["FLIGHT", "TICKETS", "EXPERIENCE", "TOUR", "CRUISE"],
  "GLOBAL.TRAVEL.FLIGHT": ["DOMESTIC", "INTERNATIONAL", "CHARTER"],
  "GLOBAL.TRAVEL.EXPERIENCE": ["ADVENTURE", "CULTURAL", "FOOD_TOUR", "GUIDED"],

  "GLOBAL.ADMIN": ["USER_MANAGEMENT", "CONTENT_MODERATION", "ANALYTICS", "SUPPORT"],
  "GLOBAL.SYSTEM": ["ENGINE", "AUDIT", "CRON", "HEALTH_CHECK", "MIGRATION"],
};

class TaxonomyGodEngine {
  private registry = new Map<string, TaxonomyNode>();
  private aliases = new Map<string, string>();

  constructor() {
    this.buildRegistry();
  }

  private buildRegistry(): void {
    for (const [parentPath, children] of Object.entries(CANONICAL_TAXONOMY)) {
      const parts = parentPath.split(".");
      const level = parts.length - 1;

      if (!this.registry.has(parentPath)) {
        const family = (parts[1] || "SYSTEM") as TaxonomyFamily;
        this.registry.set(parentPath, {
          path: parentPath,
          family,
          level,
          label: parts[parts.length - 1],
          parent: level > 0 ? parts.slice(0, -1).join(".") : null,
          children: children.map((c) => `${parentPath}.${c}`),
          aliases: [],
          rules: [],
        });
      } else {
        const node = this.registry.get(parentPath)!;
        node.children = children.map((c) => `${parentPath}.${c}`);
      }

      for (const child of children) {
        const childPath = `${parentPath}.${child}`;
        const childParts = childPath.split(".");
        const childLevel = childParts.length - 1;
        const family = (childParts[1] || "SYSTEM") as TaxonomyFamily;

        if (!this.registry.has(childPath)) {
          this.registry.set(childPath, {
            path: childPath,
            family,
            level: childLevel,
            label: child,
            parent: parentPath,
            children: [],
            aliases: [],
            rules: [],
          });
        }
      }
    }
  }

  validate(path: string): TaxonomyValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!path) {
      return { valid: false, path, errors: ["Empty path"], warnings: [] };
    }

    if (!path.startsWith("GLOBAL")) {
      errors.push("Path must start with GLOBAL");
    }

    const parts = path.split(".");
    if (parts.length < 2) {
      errors.push("Path must have at least 2 levels (GLOBAL.FAMILY)");
    }

    if (parts[1] && !CANONICAL_TAXONOMY["GLOBAL"]?.includes(parts[1])) {
      errors.push(`Unknown family: ${parts[1]}`);
      const closest = this.findClosestFamily(parts[1]);
      if (closest) {
        return {
          valid: false,
          path,
          errors,
          warnings,
          suggested_path: `GLOBAL.${closest}.${parts.slice(2).join(".")}`,
        };
      }
    }

    if (this.registry.has(path)) {
      return { valid: true, path, errors: [], warnings };
    }

    let current = "GLOBAL";
    for (let i = 1; i < parts.length; i++) {
      const next = `${current}.${parts[i]}`;
      if (!this.registry.has(next)) {
        const aliasTarget = this.aliases.get(parts[i].toUpperCase());
        if (aliasTarget) {
          warnings.push(`"${parts[i]}" resolved via alias to "${aliasTarget}"`);
        } else {
          errors.push(`Unknown node at level ${i}: "${parts[i]}" under "${current}"`);
        }
        break;
      }
      current = next;
    }

    return {
      valid: errors.length === 0,
      path,
      errors,
      warnings,
    };
  }

  registerAlias(alias: string, canonicalPath: string): boolean {
    if (this.aliases.has(alias.toUpperCase())) return false;
    if (!this.registry.has(canonicalPath)) return false;
    this.aliases.set(alias.toUpperCase(), canonicalPath);
    const node = this.registry.get(canonicalPath);
    if (node) node.aliases.push(alias);
    return true;
  }

  resolveAlias(alias: string): string | undefined {
    return this.aliases.get(alias.toUpperCase());
  }

  getNode(path: string): TaxonomyNode | undefined {
    return this.registry.get(path);
  }

  getChildren(path: string): TaxonomyNode[] {
    const node = this.registry.get(path);
    if (!node) return [];
    return node.children
      .map((c) => this.registry.get(c))
      .filter(Boolean) as TaxonomyNode[];
  }

  getFamily(family: TaxonomyFamily): TaxonomyNode[] {
    const results: TaxonomyNode[] = [];
    for (const node of this.registry.values()) {
      if (node.family === family) results.push(node);
    }
    return results;
  }

  getAllPaths(): string[] {
    return Array.from(this.registry.keys()).sort();
  }

  detectConflicts(): TaxonomyConflict[] {
    const conflicts: TaxonomyConflict[] = [];
    const labelMap = new Map<string, string[]>();

    for (const [path, node] of this.registry) {
      const key = node.label.toUpperCase();
      if (!labelMap.has(key)) labelMap.set(key, []);
      labelMap.get(key)!.push(path);
    }

    for (const [label, paths] of labelMap) {
      if (paths.length <= 1) continue;
      const families = new Set(paths.map((p) => p.split(".")[1]));
      if (families.size > 1) {
        for (let i = 0; i < paths.length; i++) {
          for (let j = i + 1; j < paths.length; j++) {
            const famA = paths[i].split(".")[1];
            const famB = paths[j].split(".")[1];
            if (famA !== famB) {
              conflicts.push({
                type: "cross_family",
                path_a: paths[i],
                path_b: paths[j],
                severity: "medium",
                description: `Label "${label}" exists in both ${famA} and ${famB}`,
                auto_fixable: false,
              });
            }
          }
        }
      }
    }

    for (const [alias, target] of this.aliases) {
      if (this.registry.has(`GLOBAL.${alias}`)) {
        conflicts.push({
          type: "alias_collision",
          path_a: `ALIAS:${alias}`,
          path_b: target,
          severity: "high",
          description: `Alias "${alias}" collides with existing path`,
          auto_fixable: true,
          suggested_fix: `Remove alias "${alias}" — path exists directly`,
        });
      }
    }

    return conflicts;
  }

  private findClosestFamily(input: string): string | null {
    const families = CANONICAL_TAXONOMY["GLOBAL"] || [];
    const upper = input.toUpperCase();
    for (const f of families) {
      if (f.includes(upper) || upper.includes(f)) return f;
    }
    return null;
  }

  getStats() {
    const familyCounts: Record<string, number> = {};
    let maxDepth = 0;
    for (const node of this.registry.values()) {
      familyCounts[node.family] = (familyCounts[node.family] || 0) + 1;
      if (node.level > maxDepth) maxDepth = node.level;
    }
    return {
      totalNodes: this.registry.size,
      totalAliases: this.aliases.size,
      maxDepth,
      familyCounts,
      conflictCount: this.detectConflicts().length,
    };
  }
}

export const taxonomyGodEngine = new TaxonomyGodEngine();
export { CANONICAL_TAXONOMY };
