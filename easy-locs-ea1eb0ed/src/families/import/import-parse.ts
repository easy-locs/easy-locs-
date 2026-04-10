/**
 * import.parse — Parse raw input into canonical import records.
 */
import type { ImportSourceType } from "./import-source";

export interface ParsedRow {
  index: number;
  raw: Record<string, string>;
  normalized: Record<string, any>;
  valid: boolean;
  errors: string[];
}

export interface ParseResult {
  rows: ParsedRow[];
  headers: string[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
}

export const ImportParse = {
  /** Parse CSV text into rows */
  parseCSV(text: string): ParseResult {
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length === 0) {
      return { rows: [], headers: [], totalRows: 0, validRows: 0, invalidRows: 0 };
    }

    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    const rows: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const raw: Record<string, string> = {};
      headers.forEach((h, idx) => { raw[h] = values[idx] || ""; });

      const errors: string[] = [];
      const hasAnyValue = Object.values(raw).some((v) => v.length > 0);
      if (!hasAnyValue) errors.push("Empty row");

      rows.push({
        index: i,
        raw,
        normalized: { ...raw },
        valid: errors.length === 0,
        errors,
      });
    }

    return {
      rows,
      headers,
      totalRows: rows.length,
      validRows: rows.filter((r) => r.valid).length,
      invalidRows: rows.filter((r) => !r.valid).length,
    };
  },

  /** Parse JSON array */
  parseJSON(text: string): ParseResult {
    try {
      const arr = JSON.parse(text);
      if (!Array.isArray(arr)) throw new Error("Expected array");

      const headers = arr.length > 0 ? Object.keys(arr[0]) : [];
      const rows: ParsedRow[] = arr.map((item: any, i: number) => ({
        index: i,
        raw: item,
        normalized: item,
        valid: true,
        errors: [],
      }));

      return {
        rows,
        headers,
        totalRows: rows.length,
        validRows: rows.length,
        invalidRows: 0,
      };
    } catch (e: any) {
      return { rows: [], headers: [], totalRows: 0, validRows: 0, invalidRows: 0 };
    }
  },
};
