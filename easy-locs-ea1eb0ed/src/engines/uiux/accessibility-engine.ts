import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class AccessibilityEngine extends BaseEngine {
  constructor() {
    super({
      id: "uiux-accessibility",
      name: "Accessibility Engine",
      category: "uiux",
      intervalMs: 120_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const images = document.querySelectorAll("img:not([alt])");
    if (images.length > 0) {
      findings.push(`${images.length} images without alt text`);
    }

    const emptyAlt = document.querySelectorAll('img[alt=""]');
    let decorative = 0;
    emptyAlt.forEach(img => {
      if ((img as HTMLImageElement).width > 100) decorative++;
    });
    if (decorative > 5) {
      findings.push(`${decorative} large images with empty alt — likely need descriptions`);
    }

    const htmlLang = document.documentElement.getAttribute("lang");
    if (!htmlLang) {
      findings.push("Missing lang attribute on <html>");
    }

    const focusable = document.querySelectorAll("a, button, input, select, textarea, [tabindex]");
    let negativeTabindex = 0;
    focusable.forEach(el => {
      const ti = el.getAttribute("tabindex");
      if (ti && parseInt(ti) < 0) negativeTabindex++;
    });
    if (negativeTabindex > 10) {
      findings.push(`${negativeTabindex} elements with negative tabindex — focus trap risk`);
    }

    const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
    let outOfOrder = 0;
    let lastLevel = 0;
    headings.forEach(h => {
      const level = parseInt(h.tagName.charAt(1));
      if (lastLevel > 0 && level > lastLevel + 1) outOfOrder++;
      lastLevel = level;
    });
    if (outOfOrder > 0) {
      findings.push(`${outOfOrder} heading level skips (e.g., h2→h4)`);
    }

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
