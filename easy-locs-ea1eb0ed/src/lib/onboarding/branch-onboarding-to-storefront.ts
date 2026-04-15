/**
 * Branch Onboarding to Storefront — Full pipeline from multi-source ingestion
 * through to seed_merchants + storefront_pages creation.
 */
import { runPipeline } from "./pipeline/orchestrator";
import { toStorefrontDraftPayload } from "./to-storefront-payload";
import { upsertSeedMerchant } from "./seed-merchant.persistence";
import { upsertStorefrontPage } from "./storefront.persistence";
import type { PipelineInput } from "./micro/pipeline.types";

export async function runOnboardingToStorefront(input: PipelineInput) {
  const result = await runPipeline({
    raw: input.query ?? input.website ?? input.name ?? "",
    vertical: input.vertical,
    city: input.city,
    district: input.district,
    country: input.country,
    phone: input.phone,
    persist: true,
  });

  const storefrontResults: Array<{
    entityId: string;
    slug: string;
    status: string;
    shop_visibility: string;
  }> = [];

  for (const record of result.canonical) {
    const publish = result.publishDecisions.find((p) => p.entityId === record.entityId);
    const visibility = publish?.targetVisibility ?? "draft";

    const payload = toStorefrontDraftPayload(record, visibility);

    const seed = await upsertSeedMerchant(record.entityId, payload);
    const storefront = await upsertStorefrontPage(record.entityId, seed.slug, payload);

    storefrontResults.push({
      entityId: record.entityId,
      slug: storefront.slug,
      status: storefront.status,
      shop_visibility: storefront.shop_visibility,
    });
  }

  return {
    runId: result.runId,
    canonicalCount: result.canonical.length,
    storefrontResults,
    publish: result.publishDecisions,
  };
}
