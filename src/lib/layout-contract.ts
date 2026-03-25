/**
 * Mobile-First Layout Contract — Enforces UX rules globally.
 * Deduplication, spacing tokens, overflow protection.
 */

/** Deduplicate items by a key function */
export function deduplicateByKey<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyFn(item).toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Canonical spacing classes for section gaps */
export const SECTION_GAP = {
  xs: "py-3 sm:py-4",
  sm: "py-4 sm:py-6",
  md: "py-6 sm:py-10",
  lg: "py-8 sm:py-14",
  xl: "py-10 sm:py-16",
} as const;

/** Horizontal scroll container classes */
export const HSCROLL = "flex overflow-x-auto scrollbar-none gap-2 pb-1 -mx-1 px-1 snap-x" as const;

/** Chip container: single row, scrollable, no wrap */
export const CHIP_ROW = "flex overflow-x-auto scrollbar-none gap-1.5 whitespace-nowrap pb-0.5" as const;

/** Safe text truncation classes */
export const TRUNCATE = {
  one: "truncate",
  two: "line-clamp-2",
  three: "line-clamp-3",
} as const;

/** Mobile-safe section wrapper */
export const SECTION_MOBILE = "px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto" as const;

/** Hero height contract */
export const HERO_HEIGHT = {
  mobile: "min-h-[320px] max-h-[480px]",
  desktop: "min-h-[500px]",
} as const;

/** Z-index contract */
export const Z_LAYOUT = {
  base: 0,
  content: 1,
  stickyFilter: 10,
  navbar: 50,
  search: 45,
  modal: 100,
  toast: 200,
} as const;
