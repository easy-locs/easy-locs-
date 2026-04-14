import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class ServiceCatalogNormalizerOrchEngine extends BaseEngine {
  constructor() {
    super({
      id: "service-catalog-normalizer",
      name: "Service Catalog Normalizer Engine",
      category: "normalizer",
      domain: "onboarding",
      intervalMs: 120_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const { runServiceCatalogNormalizer } = await import("@/lib/engines/service-catalog-normalizer-engine");
    const result = await runServiceCatalogNormalizer(50);
    const actions: string[] = [];
    if (result.normalized > 0) actions.push(`${result.normalized} service catalog issues found`);

    return {
      level: result.normalized > 0 ? "detect" : "observe",
      findings: result.results.length,
      actions,
      duration: 0,
    };
  }
}
