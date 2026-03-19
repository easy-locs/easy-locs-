/**
 * DINO Category Audit — Detects malformed labels, duplicates, orphans.
 */

import { sanitizeUiText } from "@/lib/design/textSanitizer";
import { classifyDinoIssue } from "./dinoIssueFactory";
import type { DinoIssue } from "./types";

export interface CategoryItem {
  id: string;
  label: string;
  parentId?: string | null;
}

export function auditCategories(categories: CategoryItem[]): DinoIssue[] {
  const issues: DinoIssue[] = [];
  const seen = new Map<string, string>();
  const parentIds = new Set(categories.map(c => c.id));

  for (const cat of categories) {
    const sanitized = sanitizeUiText(cat.label);

    // Malformed label
    if (cat.label !== sanitized) {
      issues.push(classifyDinoIssue({
        route: "/admin/categories",
        summary: `Malformed category label: "${cat.label}"`,
        issueType: "category",
        details: { id: cat.id, original: cat.label, sanitized },
      }));
    }

    // Near-duplicate detection
    const key = sanitized.toLowerCase().trim();
    if (seen.has(key)) {
      issues.push(classifyDinoIssue({
        route: "/admin/categories",
        summary: `Near-duplicate category: "${cat.label}"`,
        issueType: "category",
        details: { currentId: cat.id, duplicateOf: seen.get(key) },
      }));
    } else {
      seen.set(key, cat.id);
    }

    // Orphan detection
    if (cat.parentId && !parentIds.has(cat.parentId)) {
      issues.push(classifyDinoIssue({
        route: "/admin/categories",
        summary: `Orphan category: "${cat.label}" references missing parent`,
        issueType: "category",
        details: { id: cat.id, missingParent: cat.parentId },
      }));
    }
  }

  return issues;
}
