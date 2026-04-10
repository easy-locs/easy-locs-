/**
 * Entity Resolution Engine — Groups source records that refer to the same real-world entity.
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

function sameNameFingerprint(a?: string | null, b?: string | null): boolean {
  const fp = (value?: string | null) => normalize(value).split(" ").filter(Boolean).slice(0, 5).join(" ");
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

export function groupEntities(records: SourceEntityRecord[]): SourceEntityRecord[][] {
  const groups: SourceEntityRecord[][] = [];

  for (const record of records) {
    let matched = false;

    for (const group of groups) {
      const seed = group[0];
      const sameName = normalize(seed.name) && normalize(seed.name) === normalize(record.name);
      const sameCity = normalize(seed.city) === normalize(record.city);
      const sameDistrict = normalize(seed.district) === normalize(record.district);

      if (
        samePhone(seed.phone, record.phone) ||
        sameWebsite(seed.website, record.website) ||
        (sameName && sameCity) ||
        (sameName && sameDistrict) ||
        (sameNameFingerprint(seed.name, record.name) && (sameCity || sameDistrict))
      ) {
        group.push(record);
        matched = true;
        break;
      }
    }

    if (!matched) groups.push([record]);
  }

  return groups;
}
