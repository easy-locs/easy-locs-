/**
 * SEO Selectors — Read-only projections from seoStore.
 */
import { useSeoStore } from "./seo.store";
import type { SeoMeta } from "./seo.store";

export function selectSeoMeta(): SeoMeta {
  const { setMeta: _, setNoindex: _2, clear: _3, ...meta } = useSeoStore.getState();
  return meta;
}
