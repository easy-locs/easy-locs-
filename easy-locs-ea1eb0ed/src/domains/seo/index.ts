/**
 * DOMAIN: SEO — Universal Root Formula
 * INTENT → ENTRY → PIPELINE → NORMALIZER → OWNER → STATE → SELECTOR → VIEW → OUTPUT
 *
 * Single source of truth for all page meta, OG, JSON-LD, canonicals.
 */

export { seoDispatch } from "./seo-dispatch";
export type { SeoCommand, SeoCommandResult } from "./seo-dispatch";
export { useSeoStore } from "./seo.store";
export { selectSeoMeta } from "./selectors";
export { buildSeoMeta } from "./pipelines/seo-meta.pipeline";
export type { SeoMeta } from "./seo.store";
