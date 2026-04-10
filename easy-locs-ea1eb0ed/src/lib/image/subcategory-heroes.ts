import { categoryCover } from "./category-covers";

  /**
   * Curated hero images per subcategory — generated category covers.
   * Used by hero-diversity-guard to rotate images and prevent duplication.
   */
  export const SUBCATEGORY_HERO_MAP: Record<string, string[]> = new Proxy({} as Record<string, string[]>, {
    get(_target, prop: string) {
      return [categoryCover(prop, { w: 800, h: 800, demo: false })];
    },
    has() { return true; },
  });
  