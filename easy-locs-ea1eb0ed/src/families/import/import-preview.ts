/**
 * import.preview — Preview imported entities before execution.
 * Shows mapped fields, invalid rows, and duplicate warnings.
 */
import type { ParsedRow } from "./import-parse";

export interface PreviewEntry {
  index: number;
  fields: Record<string, any>;
  valid: boolean;
  errors: string[];
  isDuplicate: boolean;
  duplicateOf?: string;
}

export interface PreviewResult {
  entries: PreviewEntry[];
  totalValid: number;
  totalInvalid: number;
  totalDuplicates: number;
  ready: boolean;
}

export const ImportPreview = {
  /** Generate preview from parsed rows + dedup results */
  generate(
    rows: ParsedRow[],
    duplicateIndices?: Set<number>,
    duplicateMapping?: Map<number, string>,
  ): PreviewResult {
    const dupes = duplicateIndices || new Set<number>();
    const dupeMap = duplicateMapping || new Map<number, string>();

    const entries: PreviewEntry[] = rows.map((row) => ({
      index: row.index,
      fields: row.normalized,
      valid: row.valid,
      errors: row.errors,
      isDuplicate: dupes.has(row.index),
      duplicateOf: dupeMap.get(row.index),
    }));

    const totalValid = entries.filter((e) => e.valid && !e.isDuplicate).length;
    const totalInvalid = entries.filter((e) => !e.valid).length;
    const totalDuplicates = entries.filter((e) => e.isDuplicate).length;

    return {
      entries,
      totalValid,
      totalInvalid,
      totalDuplicates,
      ready: totalValid > 0,
    };
  },
};
