import {
  CATEGORY_TREE,
  resolveSubcategory,
  getAllSubcategoryValues,
  type PrimaryCategory,
} from "@/lib/taxonomy/category-tree";
import {
  normalizeSubcategory,
  normalizeVertical,
} from "@/lib/taxonomy/world-class-taxonomy";

export interface TaxonomyHealthIssue {
  entityId: string;
  field: string;
  severity: "critical" | "warning" | "info";
  issue: string;
  suggestion: string;
  autoFixable: boolean;
}

export interface TaxonomyHealthReport {
  totalEntities: number;
  issuesFound: TaxonomyHealthIssue[];
  autoFixed: number;
  coverageScore: number;
  missingSubcategories: string[];
  orphanedValues: string[];
}

interface EntityRecord {
  id: string;
  vertical?: string | null;
  category?: string | null;
  subcategory?: string | null;
  tags?: string[];
  name?: string | null;
}

const ALL_SUBS = new Set(getAllSubcategoryValues());

function detectVerticalMismatch(entity: EntityRecord): TaxonomyHealthIssue | null {
  if (!entity.subcategory || !entity.vertical) return null;
  const resolved = resolveSubcategory(entity.subcategory);
  if (!resolved) return null;

  const expectedVertical = resolved.primary.vertical;
  const normalizedEntityVertical = normalizeVertical(entity.vertical);

  if (expectedVertical !== normalizedEntityVertical && normalizedEntityVertical !== expectedVertical) {
    return {
      entityId: entity.id,
      field: "vertical",
      severity: "critical",
      issue: `Vertical "${entity.vertical}" conflicts with subcategory "${entity.subcategory}" (expected vertical: "${expectedVertical}")`,
      suggestion: `Change vertical to "${expectedVertical}"`,
      autoFixable: true,
    };
  }
  return null;
}

function detectOrphanedSubcategory(entity: EntityRecord): TaxonomyHealthIssue | null {
  if (!entity.subcategory) return null;
  const normalized = normalizeSubcategory(entity.subcategory);
  if (normalized && ALL_SUBS.has(normalized)) return null;

  return {
    entityId: entity.id,
    field: "subcategory",
    severity: "warning",
    issue: `Subcategory "${entity.subcategory}" is not in the canonical taxonomy`,
    suggestion: `Normalize to a known subcategory or add to category-tree.ts`,
    autoFixable: false,
  };
}

function detectMissingSubcategory(entity: EntityRecord): TaxonomyHealthIssue | null {
  if (entity.subcategory) return null;
  if (!entity.vertical) return null;

  return {
    entityId: entity.id,
    field: "subcategory",
    severity: "warning",
    issue: `Entity has vertical "${entity.vertical}" but no subcategory assigned`,
    suggestion: `Classify into an appropriate subcategory`,
    autoFixable: false,
  };
}

function detectMissingVertical(entity: EntityRecord): TaxonomyHealthIssue | null {
  if (entity.vertical) return null;

  return {
    entityId: entity.id,
    field: "vertical",
    severity: "critical",
    issue: `Entity has no vertical assigned`,
    suggestion: entity.subcategory
      ? `Infer vertical from subcategory "${entity.subcategory}"`
      : `Classify entity into a vertical`,
    autoFixable: !!entity.subcategory,
  };
}

function detectDuplicateSubcategoryInTree(): string[] {
  const seen = new Map<string, string>();
  const duplicates: string[] = [];
  for (const primary of CATEGORY_TREE) {
    for (const sub of primary.subcategories) {
      const existing = seen.get(sub.value);
      if (existing && existing !== primary.key) {
        duplicates.push(`"${sub.value}" appears in both "${existing}" and "${primary.key}"`);
      }
      seen.set(sub.value, primary.key);
    }
  }
  return duplicates;
}

export function autoFixVertical(entity: EntityRecord): string | null {
  if (!entity.subcategory) return null;
  const resolved = resolveSubcategory(entity.subcategory);
  if (!resolved) {
    const normalized = normalizeSubcategory(entity.subcategory);
    if (normalized) {
      const resolved2 = resolveSubcategory(normalized);
      if (resolved2) return resolved2.primary.vertical;
    }
    return null;
  }
  return resolved.primary.vertical;
}

export function autoFixSubcategory(rawValue: string): string | null {
  const normalized = normalizeSubcategory(rawValue);
  if (normalized && ALL_SUBS.has(normalized)) return normalized;
  return null;
}

export function runTaxonomyHealthCheck(entities: EntityRecord[]): TaxonomyHealthReport {
  const issues: TaxonomyHealthIssue[] = [];
  let autoFixed = 0;
  const orphanedValues: string[] = [];

  for (const entity of entities) {
    const verticalMismatch = detectVerticalMismatch(entity);
    if (verticalMismatch) issues.push(verticalMismatch);

    const orphaned = detectOrphanedSubcategory(entity);
    if (orphaned) {
      issues.push(orphaned);
      if (entity.subcategory) orphanedValues.push(entity.subcategory);
    }

    const missingSub = detectMissingSubcategory(entity);
    if (missingSub) issues.push(missingSub);

    const missingVert = detectMissingVertical(entity);
    if (missingVert) issues.push(missingVert);
  }

  const autoFixableCount = issues.filter(i => i.autoFixable).length;
  const treeDuplicates = detectDuplicateSubcategoryInTree();
  for (const dup of treeDuplicates) {
    issues.push({
      entityId: "TREE",
      field: "subcategory",
      severity: "info",
      issue: `Duplicate subcategory in tree: ${dup}`,
      suggestion: "Review and deduplicate in category-tree.ts",
      autoFixable: false,
    });
  }

  const entitiesWithSub = entities.filter(e => e.subcategory && ALL_SUBS.has(normalizeSubcategory(e.subcategory) ?? "")).length;
  const coverageScore = entities.length > 0 ? entitiesWithSub / entities.length : 1;

  return {
    totalEntities: entities.length,
    issuesFound: issues,
    autoFixed: autoFixableCount,
    coverageScore: Math.round(coverageScore * 100) / 100,
    missingSubcategories: [...new Set(entities.filter(e => !e.subcategory).map(e => e.vertical ?? "unknown"))],
    orphanedValues: [...new Set(orphanedValues)],
  };
}

export function suggestSubcategoryFromName(name: string, vertical?: string): string | null {
  const lower = name.toLowerCase();
  const normalizedVertical = vertical ? normalizeVertical(vertical) : null;

  const namePatterns: Array<{ pattern: RegExp; subcategory: string; vertical?: string }> = [
    { pattern: /pizza/i, subcategory: "pizza", vertical: "food" },
    { pattern: /burger/i, subcategory: "burger", vertical: "food" },
    { pattern: /sushi/i, subcategory: "sushi", vertical: "food" },
    { pattern: /shawarma|شاورما/i, subcategory: "shawarma", vertical: "food" },
    { pattern: /chicken/i, subcategory: "fried_chicken", vertical: "food" },
    { pattern: /caf[eé]|coffee|قهوة/i, subcategory: "cafe", vertical: "food" },
    { pattern: /bakery|boulangerie|مخبز/i, subcategory: "bakery", vertical: "food" },
    { pattern: /dessert|sweet|حلويات/i, subcategory: "desserts", vertical: "food" },
    { pattern: /pho|vietnamese|فيتنامي/i, subcategory: "vietnamese", vertical: "food" },
    { pattern: /greek|يوناني|gyros/i, subcategory: "greek", vertical: "food" },
    { pattern: /french|français|فرنسي/i, subcategory: "french", vertical: "food" },
    { pattern: /african|أفريقي|jollof/i, subcategory: "african", vertical: "food" },
    { pattern: /vegan|نباتي|plant.?based/i, subcategory: "vegan", vertical: "food" },
    { pattern: /juice|smoothie|عصير/i, subcategory: "juice_bar", vertical: "food" },
    { pattern: /ice.?cream|gelato|آيس كريم/i, subcategory: "ice_cream", vertical: "food" },
    { pattern: /steak|ستيك/i, subcategory: "steakhouse", vertical: "food" },
    { pattern: /bbq|barbecue|مشويات/i, subcategory: "bbq", vertical: "food" },
    { pattern: /salon|صالون/i, subcategory: "salon" },
    { pattern: /barber|حلاق/i, subcategory: "barber" },
    { pattern: /spa|سبا/i, subcategory: "spa" },
    { pattern: /nail|أظافر/i, subcategory: "nails" },
    { pattern: /tattoo|وشم/i, subcategory: "tattoo" },
    { pattern: /massage|مساج/i, subcategory: "massage" },
    { pattern: /pharmacy|صيدلية|pharmacie/i, subcategory: "pharmacy" },
    { pattern: /hotel|فندق|hôtel/i, subcategory: "hotel" },
    { pattern: /hostel/i, subcategory: "hostel" },
    { pattern: /supermarket|سوبرماركت|hypermarché/i, subcategory: "supermarket" },
  ];

  for (const { pattern, subcategory, vertical: targetVertical } of namePatterns) {
    if (pattern.test(lower)) {
      if (targetVertical && normalizedVertical && normalizedVertical !== targetVertical) continue;
      return subcategory;
    }
  }

  return null;
}

export function getTreeIntegrityReport(): {
  totalPrimaries: number;
  totalSubcategories: number;
  duplicates: string[];
  emptyClusters: string[];
  missingTags: string[];
} {
  const duplicates = detectDuplicateSubcategoryInTree();
  const missingTags: string[] = [];
  const emptyClusters: string[] = [];
  let totalSubs = 0;

  for (const primary of CATEGORY_TREE) {
    const clusterSet = new Set(primary.subcategories.map(s => s.cluster));
    for (const cluster of clusterSet) {
      const clusterSubs = primary.subcategories.filter(s => s.cluster === cluster);
      if (clusterSubs.length === 0) emptyClusters.push(`${primary.key}/${cluster}`);
    }
    for (const sub of primary.subcategories) {
      totalSubs++;
      if (!sub.tags?.length) missingTags.push(`${primary.key}/${sub.value}`);
    }
  }

  return {
    totalPrimaries: CATEGORY_TREE.length,
    totalSubcategories: totalSubs,
    duplicates,
    emptyClusters,
    missingTags,
  };
}
