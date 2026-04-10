/**
 * Data Integrity Guard — Anti-corruption layer.
 * Prevents cross-vertical contamination and invalid data from entering the pipeline.
 * Extends the existing coherence engine — does NOT duplicate it.
 */
import type { CanonicalShopData } from "./parsers/canonical-format";
import { validateEntityMenuCoherence, type CoherenceInput } from "@/lib/engines/coherence-engine";

export interface IntegrityResult {
  passed: boolean;
  score: number;
  violations: IntegrityViolation[];
  auto_fixes: string[];
}

export interface IntegrityViolation {
  type: "cross_vertical" | "menu_mismatch" | "missing_critical" | "suspicious_data" | "duplicate_items";
  severity: "block" | "warn";
  message: string;
  field?: string;
}

/**
 * Run full integrity check on canonical data before ingestion.
 */
export function checkDataIntegrity(data: CanonicalShopData): IntegrityResult {
  const violations: IntegrityViolation[] = [];
  const auto_fixes: string[] = [];

  // 1. Critical field validation
  if (!data.name?.trim()) {
    violations.push({ type: "missing_critical", severity: "block", message: "Missing entity name", field: "name" });
  }

  // 2. Cross-vertical contamination check via coherence engine
  if (data.vertical && data.menu_items && data.menu_items.length > 0) {
    const coherenceInput: CoherenceInput = {
      entity_name: data.name,
      entity_vertical: data.vertical,
      entity_subcategory: data.subcategory || null,
      entity_tags: data.cuisine_tags || [],
      menu_items: data.menu_items.map(item => ({
        name: item.name,
        category: item.category,
        tags: item.tags,
      })),
    };

    const coherence = validateEntityMenuCoherence(coherenceInput);

    if (coherence.status === "blocked") {
      violations.push({
        type: "menu_mismatch",
        severity: "block",
        message: `Menu coherence blocked: ${coherence.quarantine_reason || "score too low"} (score: ${coherence.entity_menu_match_score})`,
      });
    } else if (coherence.status === "review_required") {
      violations.push({
        type: "menu_mismatch",
        severity: "warn",
        message: `Menu coherence review needed (score: ${coherence.entity_menu_match_score})`,
      });
    }

    if (coherence.conflicts.length > 0) {
      for (const conflict of coherence.conflicts) {
        violations.push({
          type: "cross_vertical",
          severity: "warn",
          message: conflict,
        });
      }
    }
  }

  // 3. Duplicate items in menu
  if (data.menu_items && data.menu_items.length > 0) {
    const names = data.menu_items.map(i => i.name.toLowerCase().trim());
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    if (dupes.length > 0) {
      violations.push({
        type: "duplicate_items",
        severity: "warn",
        message: `${dupes.length} duplicate menu items detected`,
      });
    }
  }

  // 4. Suspicious data patterns
  if (data.rating && (data.rating < 0 || data.rating > 5)) {
    violations.push({
      type: "suspicious_data",
      severity: "warn",
      message: `Rating ${data.rating} outside valid range 0-5`,
      field: "rating",
    });
  }

  if (data.menu_items) {
    const invalidPrices = data.menu_items.filter(i => i.price != null && (i.price < 0 || i.price > 50000));
    if (invalidPrices.length > 0) {
      violations.push({
        type: "suspicious_data",
        severity: "warn",
        message: `${invalidPrices.length} menu items with suspicious prices`,
      });
    }
  }

  // Calculate score
  const blockCount = violations.filter(v => v.severity === "block").length;
  const warnCount = violations.filter(v => v.severity === "warn").length;
  const score = Math.max(0, 100 - blockCount * 40 - warnCount * 10);

  return {
    passed: blockCount === 0,
    score,
    violations,
    auto_fixes,
  };
}

/**
 * Auto-repair what can be safely fixed.
 */
export function autoRepairData(data: CanonicalShopData): { repaired: CanonicalShopData; fixes: string[] } {
  const fixes: string[] = [];
  const repaired = { ...data };

  // Fix name whitespace
  if (repaired.name) {
    const clean = repaired.name.replace(/\s+/g, " ").trim();
    if (clean !== repaired.name) {
      repaired.name = clean;
      fixes.push("Cleaned name whitespace");
    }
  }

  // Fix rating range
  if (repaired.rating != null) {
    if (repaired.rating > 5 && repaired.rating <= 10) {
      repaired.rating = Math.round((repaired.rating / 2) * 10) / 10;
      fixes.push(`Normalized rating from 0-10 to 0-5 scale`);
    } else if (repaired.rating < 0 || repaired.rating > 10) {
      repaired.rating = undefined;
      fixes.push("Removed invalid rating");
    }
  }

  // Deduplicate menu items
  if (repaired.menu_items && repaired.menu_items.length > 0) {
    const seen = new Set<string>();
    const original = repaired.menu_items.length;
    repaired.menu_items = repaired.menu_items.filter(item => {
      const key = item.name.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const removed = original - repaired.menu_items.length;
    if (removed > 0) fixes.push(`Removed ${removed} duplicate menu items`);
  }

  // Remove items with invalid prices
  if (repaired.menu_items) {
    const before = repaired.menu_items.length;
    repaired.menu_items = repaired.menu_items.filter(i => i.price == null || (i.price >= 0 && i.price <= 50000));
    const removed = before - repaired.menu_items.length;
    if (removed > 0) fixes.push(`Removed ${removed} items with invalid prices`);
  }

  // Deduplicate images
  if (repaired.images && repaired.images.length > 0) {
    const before = repaired.images.length;
    repaired.images = [...new Set(repaired.images)];
    const removed = before - repaired.images.length;
    if (removed > 0) fixes.push(`Removed ${removed} duplicate images`);
  }

  return { repaired, fixes };
}
