import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class LayoutConsistencyEngine extends BaseEngine {
  constructor() {
    super({
      id: "uiux-layout",
      name: "Layout Consistency Engine",
      category: "uiux",
      intervalMs: 60_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const overflows: string[] = [];
    const body = document.body;
    if (body.scrollWidth > window.innerWidth + 5) {
      findings.push(`Horizontal overflow: body is ${body.scrollWidth - window.innerWidth}px wider than viewport`);
    }

    const textEls = document.querySelectorAll("h1, h2, h3, p, span, a, button");
    const fontSizes = new Set<string>();
    textEls.forEach(el => {
      const style = getComputedStyle(el);
      fontSizes.add(style.fontSize);
    });
    if (fontSizes.size > 15) {
      findings.push(`Font size inconsistency: ${fontSizes.size} different sizes used`);
    }

    const zIndices = new Set<string>();
    const allEls = document.querySelectorAll("*");
    allEls.forEach(el => {
      const z = getComputedStyle(el).zIndex;
      if (z !== "auto" && parseInt(z) > 100) zIndices.add(z);
    });
    if (zIndices.size > 10) {
      findings.push(`Z-index sprawl: ${zIndices.size} high z-index values (>100)`);
    }

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
