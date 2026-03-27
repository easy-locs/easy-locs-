/**
 * Deliveroo Food Pipeline — Utility Functions
 */
import { BLOCKED_CATEGORIES } from "./deliveroo-food-types";

const PLACEHOLDER_PATTERNS = [
  "via.placeholder",
  "placehold.co",
  "dummyimage",
  "images.unsplash.com",
  "unsplash.com",
  "placeholder.com",
  "picsum.photos",
  "lorempixel",
  "placekitten",
];

export function normalizeText(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/\s+/g, " ")
    .replace(/[^\w\s\-''&.,()é à ü ö ä]/gi, "")
    .trim();
}

export function normalizePhone(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/[^\d+]/g, "");
  return digits.length >= 7 ? digits : null;
}

export function slugifyMerchantName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/&/g, "and")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function isInvalidCategory(value: string | null | undefined): boolean {
  if (!value) return true;
  const cat = value.toLowerCase().trim();
  return (BLOCKED_CATEGORIES as readonly string[]).includes(cat);
}

export function isPlaceholderImage(url: string | null | undefined): boolean {
  if (!url) return true;
  const lower = url.toLowerCase();
  return PLACEHOLDER_PATTERNS.some((p) => lower.includes(p));
}

export function isDubaiCity(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.toLowerCase().trim();
  return v === "dubai" || v === "dubaï" || v === "دبي" || v === "dxb";
}

export function safeNumber(value: unknown): number {
  const n = Number(value);
  return isNaN(n) ? 0 : n;
}

export function hasValidCoordinates(lat: unknown, lng: unknown): boolean {
  const la = safeNumber(lat);
  const lo = safeNumber(lng);
  if (la === 0 && lo === 0) return false;
  // Dubai rough bounding box
  return la >= 24.5 && la <= 25.6 && lo >= 54.8 && lo <= 56.0;
}

export function dedupeStrings(arr: string[]): string[] {
  return [...new Set(arr.filter(Boolean))];
}

export function firstNonEmpty(...values: (string | null | undefined)[]): string {
  for (const v of values) {
    if (v && v.trim().length > 0) return v.trim();
  }
  return "";
}
