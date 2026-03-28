/**
 * Item Deduplicator — Removes duplicate named items (menu, hotel, service).
 * ONE responsibility: dedupe by normalized name fingerprint.
 */
import { normalizeText } from "./text.normalizer";

const JUNK_NAMES = /^(item|menu|product|test|undefined|null)$/i;

export function dedupeNamedItems(items: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  const seen = new Set<string>();

  return items.filter((item) => {
    const rawName = [item.name, item.title, item.label, item.room_type]
      .find((v) => typeof v === "string" && v.trim().length > 0);

    const normalized = typeof rawName === "string"
      ? normalizeText(rawName)?.toLowerCase()
      : null;

    if (!normalized || normalized.length < 2 || JUNK_NAMES.test(normalized) || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);

    // Normalize name fields in-place
    if (typeof item.name === "string") item.name = normalizeText(item.name) ?? item.name;
    if (typeof item.title === "string") item.title = normalizeText(item.title) ?? item.title;
    if (typeof item.label === "string") item.label = normalizeText(item.label) ?? item.label;
    if (typeof item.room_type === "string") item.room_type = normalizeText(item.room_type) ?? item.room_type;

    return true;
  });
}
