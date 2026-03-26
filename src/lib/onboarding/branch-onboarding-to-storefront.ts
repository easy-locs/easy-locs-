/**
 * Branch Onboarding to Storefront — Full pipeline from multi-source ingestion
 * through to seed_merchants + storefront_pages creation.
 */
import { runOnboardingPipeline } from "./onboarding-orchestrator";
import { persistOnboardingRun } from "./onboarding-persistence";
import { toStorefrontDraftPayload } from "./to-storefront-payload";
import { upsertSeedMerchant } from "./seed-merchant.persistence";
import { upsertStorefrontPage } from "./storefront.persistence";
import type { OnboardingRequest } from "./onboarding-orchestrator";

export async function runOnboardingToStorefront(input: OnboardingRequest) {
  const result = await runOnboardingPipeline(input);
  const runId = await persistOnboardingRun(input, result);

  const storefrontResults: Array<{
    entityId: string;
    slug: string;
    status: string;
    shop_visibility: string;
  }> = [];

  for (const record of result.canonical) {
    const publish = result.publish.find((p) => p.entityId === record.entityId);
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
    runId,
    canonicalCount: result.canonical.length,
    storefrontResults,
    publish: result.publish,
  };
}
