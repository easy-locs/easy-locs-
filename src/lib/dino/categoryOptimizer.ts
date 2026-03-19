/**
 * DINO V5 — Smart Category Auto-Organization
 * Detects duplicates, normalizes labels, reorders by usage, merges/splits.
 */

import { sanitizeUiText } from "@/lib/design/textSanitizer";

export interface CategoryEntry {
  id: string;
  label: string;
  parentId?: string | null;
  usageCount: number;
  lastUsedAt?: string | null;
}

export interface CategoryOptimization {
  type: "merge" | "split" | "rename" | "reorder" | "deactivate";
  targetIds: string[];
  description: string;
  safeToAutoApply: boolean;
  suggestedLabel?: string;
  suggestedOrder?: number;
}

/** Normalize and find near-duplicates */
function normalizeKey(label: string): string {
  return sanitizeUiText(label).toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

export function optimizeCategories(categories: CategoryEntry[]): CategoryOptimization[] {
  const ops: CategoryOptimization[] = [];
  const keyMap = new Map<string, CategoryEntry[]>();

  // Group by normalized key
  for (const cat of categories) {
    const key = normalizeKey(cat.label);
    if (!keyMap.has(key)) keyMap.set(key, []);
    keyMap.get(key)!.push(cat);
  }

  // Merge duplicates
  for (const [, group] of keyMap) {
    if (group.length > 1) {
      const best = group.reduce((a, b) => a.usageCount > b.usageCount ? a : b);
      ops.push({
        type: "merge",
        targetIds: group.map(g => g.id),
        description: `Merge ${group.length} duplicate categories into "${best.label}"`,
        safeToAutoApply: group.length === 2,
        suggestedLabel: sanitizeUiText(best.label),
      });
    }
  }

  // Rename malformed labels
  for (const cat of categories) {
    const clean = sanitizeUiText(cat.label);
    if (clean !== cat.label) {
      ops.push({
        type: "rename",
        targetIds: [cat.id],
        description: `Rename "${cat.label}" → "${clean}"`,
        safeToAutoApply: true,
        suggestedLabel: clean,
      });
    }
  }

  // Reorder by usage (top used first)
  const sorted = [...categories].sort((a, b) => b.usageCount - a.usageCount);
  sorted.forEach((cat, idx) => {
    ops.push({
      type: "reorder",
      targetIds: [cat.id],
      description: `Reorder "${cat.label}" to position ${idx + 1} (usage: ${cat.usageCount})`,
      safeToAutoApply: true,
      suggestedOrder: idx + 1,
    });
  });

  // Deactivate zero-usage categories (>30 days old)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  for (const cat of categories) {
    if (cat.usageCount === 0 && cat.lastUsedAt && cat.lastUsedAt < thirtyDaysAgo) {
      ops.push({
        type: "deactivate",
        targetIds: [cat.id],
        description: `Deactivate unused category "${cat.label}" (0 usage, stale)`,
        safeToAutoApply: false,
      });
    }
  }

  return ops;
}
