/**
 * run-import-pipeline — Orchestrates the full shop import pipeline.
 * source → adapter → normalize → score → enrich → save → emit
 */
import type { CanonicalShop } from "./canonical-shop.schema";
import { deliverooAdapter } from "./adapters/deliveroo.adapter";
import { talabatAdapter } from "./adapters/talabat.adapter";
import { webAdapter } from "./adapters/web.adapter";
import { normalizeShop } from "./normalizer/normalize-shop";
import { scoreShop } from "./quality/score-shop";
import { enrichShop } from "./enrichment/enrich-shop";
import { onboardingRepository } from "./repository/onboarding.repository";
import { emitShopImported } from "./events/onboarding.events";

const ADAPTERS: Record<string, (raw: any) => Promise<CanonicalShop>> = {
  deliveroo: deliverooAdapter,
  talabat: talabatAdapter,
  web: webAdapter,
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
