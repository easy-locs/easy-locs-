/**
 * run-import-pipeline — Orchestrates the full shop import pipeline.
 * source → adapter → normalize → score → enrich → save → emit
 */
import type { CanonicalShop } from "./canonical-shop.schema";
import { adaptDeliverooMerchant } from "./adapters/deliveroo.adapter";
import { adaptTalabatMerchant } from "./adapters/talabat.adapter";
import { adaptWebMerchant } from "./adapters/web.adapter";
import { normalizeShop } from "./normalizer/normalize-shop";
import { scoreShop } from "./quality/score-shop";
import { enrichShop } from "./enrichment/enrich-shop";
import { onboardingRepository } from "./repository/onboarding.repository";
import { emitShopImported } from "./events/onboarding.events";

const toCanonicalShop = (fn: (raw: any) => any) => async (raw: any): Promise<CanonicalShop> => {
  const r = fn(raw);
  return { id: r.id, name: r.name, location: { address: r.geo?.normalizedAddress || "", city: r.geo?.city || "", country: r.geo?.country || "", lat: r.geo?.lat || 0, lng: r.geo?.lng || 0 }, categories: r.tags || [], products: [], media: r.media || { gallery: [] }, hours: r.hours || [], delivery: r.delivery || {}, quality: { score: r.quality?.score || 0, missingFields: r.quality?.missingFields || [] } } as any;
};

const ADAPTERS: Record<string, (raw: any) => Promise<CanonicalShop>> = {
  deliveroo: toCanonicalShop(adaptDeliverooMerchant),
  talabat: toCanonicalShop(adaptTalabatMerchant),
  web: toCanonicalShop(adaptWebMerchant),
};

export async function runImportPipeline(source: string, raw: any): Promise<CanonicalShop> {
  const adapter = ADAPTERS[source];
  if (!adapter) throw new Error(`Unknown source adapter: ${source}`);

  // 1. Adapt
  let shop = await adapter(raw);

  // 2. Normalize
  shop = normalizeShop(shop);

  // 3. Score
  shop = scoreShop(shop);

  // 4. Enrich
  shop = await enrichShop(shop);

  // 5. Save
  await onboardingRepository.save(shop);

  // 6. Emit
  emitShopImported(shop);

  return shop;
}
