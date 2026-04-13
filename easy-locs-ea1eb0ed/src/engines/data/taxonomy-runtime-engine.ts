import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { RADAR_CATEGORIES } from "@/lib/taxonomy/world-class-taxonomy";

const EMOJI_MAP: Record<string, string> = Object.fromEntries(
  RADAR_CATEGORIES.map(c => [c.value, c.emoji])
);

const KNOWN_CATEGORIES = new Set(RADAR_CATEGORIES.map(c => c.value));

export class TaxonomyRuntimeEngine extends BaseEngine {
  private correctionCount = 0;

  constructor() {
    super({
      id: "data-taxonomy-runtime",
      name: "Taxonomy Runtime Engine",
      category: "data",
      intervalMs: 30_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];
    const actions: string[] = [];

    if (document.hidden) {
      return { level: "observe", findings: 0, actions: [], duration: 0 };
    }

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

    return {
      level: actions.length > 0 ? "act" : findings.length > 0 ? "detect" : "observe",
      findings: findings.length,
      actions,
      duration: 0,
    };
  }
}
