import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class DesignRegressionEngine extends BaseEngine {
  private lastScreenState: { path: string; elementCount: number; timestamp: number } | null = null;

  constructor() {
    super({
      id: "uiux-design-regression",
      name: "Design Regression Engine",
      category: "uiux",
      intervalMs: 60_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const path = window.location.pathname;
    const elementCount = document.querySelectorAll("*").length;

    if (this.lastScreenState && this.lastScreenState.path === path) {
      const change = Math.abs(elementCount - this.lastScreenState.elementCount);
      const changePercent = change / this.lastScreenState.elementCount;
      if (changePercent > 0.5 && change > 100) {
        findings.push(`Major DOM change on same route: ${this.lastScreenState.elementCount} → ${elementCount} elements`);
      }
    }
    this.lastScreenState = { path, elementCount, timestamp: Date.now() };

    const emptyContainers = document.querySelectorAll("main, section, [role='main']");
    emptyContainers.forEach(el => {
      if (el.children.length === 0 && el.textContent?.trim() === "") {
        findings.push(`Empty container: <${el.tagName.toLowerCase()}>`);
      }
    });

    const brokenImages = document.querySelectorAll("img");
    let broken = 0;
    brokenImages.forEach(img => {
      if (img.complete && img.naturalWidth === 0 && img.src && !img.src.startsWith("data:")) broken++;
    });
    if (broken > 3) {
      findings.push(`${broken} broken images on page`);
    }

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
