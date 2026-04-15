/**
 * Entity Resolution Engine — Groups source records that refer to the same real-world entity.
 * Uses exact matching, fingerprint matching, Levenshtein fuzzy matching, and
 * basic Arabic↔Latin transliteration for common patterns.
 */
import type { SourceEntityRecord } from "./types";

function normalize(s?: string | null): string {
  return (s ?? "")
    .trim()
    .toLowerCase()
    .replace(/deliveroo|talabat|careem|booking|noon/gi, " ")
    .replace(/[()|•·'"`]/g, " ")
    .replace(/\s+/g, " ");
}

const ARABIC_LATIN_MAP: Array<[RegExp, string]> = [
  [/\bal[\s-]?/gi, "al "],
  [/\bel[\s-]?/gi, "el "],
  [/مطعم/g, "restaurant"],
  [/فندق/g, "hotel"],
  [/مقهى/g, "cafe"],
  [/كافيه/g, "cafe"],
  [/بيتزا/g, "pizza"],
  [/شاورما/g, "shawarma"],
  [/مشويات/g, "grills"],
  [/حلويات/g, "sweets"],
  [/سوبرماركت/g, "supermarket"],
  [/بقالة/g, "grocery"],
  [/صيدلية/g, "pharmacy"],
];

function transliterate(s: string): string {
  let result = s;
  for (const [pattern, replacement] of ARABIC_LATIN_MAP) {
    result = result.replace(pattern, replacement);
  }
  return result.trim().replace(/\s+/g, " ");
}

function normalizeWithTransliteration(s?: string | null): string {
  return transliterate(normalize(s));
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) matrix[i] = [i];
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[a.length][b.length];
}

function fuzzyNameMatch(a?: string | null, b?: string | null): boolean {
  const na = normalizeWithTransliteration(a).trim();
  const nb = normalizeWithTransliteration(b).trim();
  if (!na || !nb) return false;
  if (na.length <= 5 || nb.length <= 5) return na === nb;
  return levenshteinDistance(na, nb) <= 2;
}

function sameNameFingerprint(a?: string | null, b?: string | null): boolean {
  const fp = (value?: string | null) => normalizeWithTransliteration(value).split(" ").filter(Boolean).slice(0, 5).join(" ");
  const left = fp(a);
  const right = fp(b);
  return !!left && left === right;
}

function samePhone(a?: string | null, b?: string | null): boolean {
  const clean = (v?: string | null) => (v ?? "").replace(/[^\d+]/g, "");
  return !!clean(a) && clean(a) === clean(b);
}

function sameWebsite(a?: string | null, b?: string | null): boolean {
  const clean = (v?: string | null) => normalize(v).replace(/^https?:\/\//, "").replace(/^www\./, "");
  return !!clean(a) && clean(a) === clean(b);
}

function matchesGroup(group: SourceEntityRecord[], record: SourceEntityRecord): boolean {
  for (const member of group) {
    const sameName = normalize(member.name) && normalize(member.name) === normalize(record.name);
    const sameCity = normalize(member.city) === normalize(record.city);
    const sameDistrict = normalize(member.district) === normalize(record.district);

    if (
      samePhone(member.phone, record.phone) ||
      sameWebsite(member.website, record.website) ||
      (sameName && sameCity) ||
      (sameName && sameDistrict) ||
      (sameNameFingerprint(member.name, record.name) && (sameCity || sameDistrict)) ||
      (fuzzyNameMatch(member.name, record.name) && (sameCity || sameDistrict))
    ) {
      return true;
    }
  }
  return false;
}

export function groupEntities(records: SourceEntityRecord[]): SourceEntityRecord[][] {
  const groups: SourceEntityRecord[][] = [];

  for (const record of records) {
    let matched = false;

    for (const group of groups) {
      if (matchesGroup(group, record)) {
        group.push(record);
        matched = true;
        break;
      }
    }

    if (!matched) groups.push([record]);
  }

  return groups;
}
