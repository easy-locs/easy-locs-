/**
 * Deliveroo Food Pipeline — Visual Audit & Cleanup
 */
import { isPlaceholderImage } from "./deliveroo-food-utils";

interface VisualAuditInput {
  merchant_id: string;
  logo_image: string | null;
  cover_image: string | null;
}

export interface VisualAuditResult {
  merchant_id: string;
  logo_ok: boolean;
  cover_ok: boolean;
  duplicate_cover: boolean;
  placeholder_logo: boolean;
  placeholder_cover: boolean;
  notes: string[];
}

export function auditMerchantVisuals(input: VisualAuditInput): Omit<VisualAuditResult, "duplicate_cover"> {
  const logo_ok = !!input.logo_image && !isPlaceholderImage(input.logo_image);
  const cover_ok = !!input.cover_image && !isPlaceholderImage(input.cover_image);
  const placeholder_logo = !logo_ok;
  const placeholder_cover = !cover_ok;

  const notes: string[] = [];
  if (placeholder_logo) notes.push("Logo missing or placeholder");
  if (placeholder_cover) notes.push("Cover missing or placeholder");

  return {
    merchant_id: input.merchant_id,
    logo_ok,
    cover_ok,
    duplicate_cover: false, // set by batch duplicate detection
    placeholder_logo,
    placeholder_cover,
    notes,
  };
}

/**
 * Detect duplicate covers across a batch of merchants.
 * Returns a Set of merchant IDs that have duplicate covers.
 */
export function detectDuplicateCovers(
  merchants: Array<{ id: string; cover_image: string | null }>
): Set<string> {
  const coverMap = new Map<string, string[]>();
  const duplicateIds = new Set<string>();

  for (const m of merchants) {
    if (!m.cover_image || isPlaceholderImage(m.cover_image)) continue;
    const key = m.cover_image.toLowerCase().trim();
    const ids = coverMap.get(key) || [];
    ids.push(m.id);
    coverMap.set(key, ids);
  }

  for (const ids of coverMap.values()) {
    if (ids.length > 1) {
      ids.forEach((id) => duplicateIds.add(id));
    }
  }

  return duplicateIds;
}

export function chooseBestPublicVisual(
  logo: string | null,
  cover: string | null
): { display_image: string | null; source: string } {
  if (cover && !isPlaceholderImage(cover)) return { display_image: cover, source: "cover" };
  if (logo && !isPlaceholderImage(logo)) return { display_image: logo, source: "logo" };
  return { display_image: null, source: "none" };
}
