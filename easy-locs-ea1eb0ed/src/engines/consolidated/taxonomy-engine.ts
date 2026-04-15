import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { RADAR_CATEGORIES } from "@/lib/taxonomy/world-class-taxonomy";

const EMOJI_MAP: Record<string, string> = Object.fromEntries(
  RADAR_CATEGORIES.map(c => [c.value, c.emoji])
);
const KNOWN_CATEGORIES = new Set(RADAR_CATEGORIES.map(c => c.value));

export interface VerticalConfig {
  id: string;
  name: string;
  domain: string;
  criticality: "critical" | "high" | "medium";
}

const VERTICAL_CONFIGS: VerticalConfig[] = [
  { id: "food", name: "Food", domain: "food", criticality: "high" },
  { id: "hotel", name: "Hotel", domain: "hotel", criticality: "high" },
  { id: "service", name: "Service", domain: "service", criticality: "high" },
  { id: "real-estate", name: "Real Estate", domain: "real-estate", criticality: "medium" },
  { id: "delivery", name: "Delivery", domain: "delivery", criticality: "critical" },
  { id: "flight", name: "Flight", domain: "flight", criticality: "high" },
  { id: "health", name: "Health", domain: "health", criticality: "medium" },
  { id: "shop", name: "Shop", domain: "shop", criticality: "medium" },
];

export function getVerticalConfigs(): VerticalConfig[] {
  return [...VERTICAL_CONFIGS];
}

export class TaxonomyEngine extends BaseEngine {
  private correctionCount = 0;

  constructor() {
    super({
      id: "taxonomy-engine",
      name: "Taxonomy Engine",
      category: "taxonomy",
      domain: "taxonomy",
      intervalMs: 30_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const actions: string[] = [];
    const findings: string[] = [];

    this.tickTaxonomyRuntime(findings, actions);
    await this.tickAdaptiveTaxonomy(findings, actions);
    await this.tickCategoryMapping(findings, actions);
    await this.tickNormalizers(findings, actions);
    await this.tickTaxonomyIntegrity(findings, actions);

    return {
      level: actions.length > 0 ? "act" : findings.length > 0 ? "detect" : "observe",
      findings: findings.length,
      actions,
      duration: 0,
    };
  }

  private tickTaxonomyRuntime(findings: string[], actions: string[]): void {
    if (document.hidden) return;

    const emojiEls = document.querySelectorAll("[data-category-emoji]");
    emojiEls.forEach(el => {
      const category = el.getAttribute("data-category") || "";
      const currentEmoji = el.getAttribute("data-category-emoji") || "";
      const expectedEmoji = EMOJI_MAP[category];
      if (expectedEmoji && currentEmoji !== expectedEmoji) {
        findings.push(`Wrong emoji for ${category}: "${currentEmoji}" → "${expectedEmoji}"`);
        el.setAttribute("data-category-emoji", expectedEmoji);
        if (el instanceof HTMLElement && el.textContent?.trim() === currentEmoji) {
          el.textContent = expectedEmoji;
        }
        actions.push(`Corrected emoji for ${category}`);
        this.correctionCount++;
      }
    });

    const categoryEls = document.querySelectorAll("[data-category]");
    categoryEls.forEach(el => {
      const category = el.getAttribute("data-category") || "";
      if (category && !KNOWN_CATEGORIES.has(category) && category !== "all") {
        findings.push(`Unknown category in DOM: "${category}"`);
      }
    });

    const verticalEls = document.querySelectorAll("[data-vertical]");
    verticalEls.forEach(el => {
      const vertical = el.getAttribute("data-vertical") || "";
      if (vertical && !KNOWN_CATEGORIES.has(vertical) && vertical !== "all") {
        findings.push(`Unknown vertical in DOM: "${vertical}"`);
      }
    });
  }

  private async tickAdaptiveTaxonomy(findings: string[], actions: string[]): Promise<void> {
    try {
      const { runAdaptiveTaxonomyEngine } = await import("@/lib/engines/adaptive-taxonomy-engine");
      const result = await runAdaptiveTaxonomyEngine(100);
      if (result.mapped > 0) actions.push(`${result.mapped} taxonomy suggestions`);
      findings.push(...result.results.map(() => "taxonomy-scan"));
    } catch (err) { if (import.meta.env.DEV) console.warn('[taxonomy] sub-module error', err instanceof Error ? err.message : err); }
  }

  private async tickCategoryMapping(findings: string[], actions: string[]): Promise<void> {
    try {
      const { runCategoryMappingSync } = await import("@/lib/engines/category-mapping-engine");
      const result = await runCategoryMappingSync(200);
      if (result.remapped > 0) actions.push(`${result.remapped} categories remapped`);
    } catch (err) { if (import.meta.env.DEV) console.warn('[taxonomy] sub-module error', err instanceof Error ? err.message : err); }
  }

  private async tickNormalizers(findings: string[], actions: string[]): Promise<void> {
    try {
      const { runGroceryNormalizer } = await import("@/lib/engines/grocery-normalizer-engine");
      const groceryResult = await runGroceryNormalizer(50);
      if (groceryResult.normalized > 0) actions.push(`${groceryResult.normalized} grocery issues found`);
    } catch (err) { if (import.meta.env.DEV) console.warn('[taxonomy] sub-module error', err instanceof Error ? err.message : err); }

    try {
      const { runFoodMenuNormalizer } = await import("@/lib/engines/food-menu-normalizer-engine");
      const foodResult = await runFoodMenuNormalizer();
      if (foodResult.normalized > 0) actions.push(`${foodResult.normalized} menu issues found`);
    } catch (err) { if (import.meta.env.DEV) console.warn('[taxonomy] sub-module error', err instanceof Error ? err.message : err); }

    try {
      const { runServiceCatalogNormalizer } = await import("@/lib/engines/service-catalog-normalizer-engine");
      const serviceResult = await runServiceCatalogNormalizer(50);
      if (serviceResult.normalized > 0) actions.push(`${serviceResult.normalized} service catalog issues found`);
    } catch (err) { if (import.meta.env.DEV) console.warn('[taxonomy] sub-module error', err instanceof Error ? err.message : err); }

    try {
      const { runMenuRebuildEngine } = await import("@/lib/engines/menu-rebuild-engine");
      const rebuildResult = await runMenuRebuildEngine(100);
      if (rebuildResult.rebuilt > 0) actions.push(`${rebuildResult.rebuilt} menus need rebuild`);
    } catch (err) { if (import.meta.env.DEV) console.warn('[taxonomy] sub-module error', err instanceof Error ? err.message : err); }
  }

  private async tickTaxonomyIntegrity(findings: string[], actions: string[]): Promise<void> {
    try {
      const { TaxonomyIntegrityEngine } = await import("@/lib/data-quality/engines/taxonomy-integrity-engine");
      const engine = new TaxonomyIntegrityEngine();
      engine.scan("SAFE_AUTO");
    } catch (err) { if (import.meta.env.DEV) console.warn('[taxonomy] sub-module error', err instanceof Error ? err.message : err); }
  }
}
