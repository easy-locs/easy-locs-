/**
 * import.dedup — Canonical duplicate detection for import rows.
 */

export interface DedupResult {
  duplicateIndices: Set<number>;
  duplicateMapping: Map<number, string>; // index → duplicate-of key
  uniqueCount: number;
}

export const ImportDedup = {
  /** Detect duplicates by a key field (e.g. "email", "phone", "name") */
  detectByField(
    rows: { index: number; normalized: Record<string, any> }[],
    keyField: string,
  ): DedupResult {
    const seen = new Map<string, number>(); // value → first index
    const duplicateIndices = new Set<number>();
    const duplicateMapping = new Map<number, string>();

    for (const row of rows) {
      const val = String(row.normalized[keyField] || "").trim().toLowerCase();
      if (!val) continue;

      if (seen.has(val)) {
        duplicateIndices.add(row.index);
        duplicateMapping.set(row.index, val);
      } else {
        seen.set(val, row.index);
      }
    }

    return {
      duplicateIndices,
      duplicateMapping,
      uniqueCount: rows.length - duplicateIndices.size,
    };
  },

  /** Multi-field dedup (composite key) */
  detectByFields(
    rows: { index: number; normalized: Record<string, any> }[],
    keyFields: string[],
  ): DedupResult {
    const seen = new Map<string, number>();
    const duplicateIndices = new Set<number>();
    const duplicateMapping = new Map<number, string>();

    for (const row of rows) {
      const key = keyFields
        .map((f) => String(row.normalized[f] || "").trim().toLowerCase())
        .join("|");
      if (!key.replace(/\|/g, "")) continue;

      if (seen.has(key)) {
        duplicateIndices.add(row.index);
        duplicateMapping.set(row.index, key);
      } else {
        seen.set(key, row.index);
      }
    }

    return {
      duplicateIndices,
      duplicateMapping,
      uniqueCount: rows.length - duplicateIndices.size,
    };
  },
};
