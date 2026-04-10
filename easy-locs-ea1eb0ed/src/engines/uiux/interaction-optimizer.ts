import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class InteractionOptimizer extends BaseEngine {
  private longPresses: number = 0;
  private touchStartTime: number = 0;

  constructor() {
    super({
      id: "uiux-interaction",
      name: "Interaction Optimizer",
      category: "uiux",
      intervalMs: 30_000,
    });
    document.addEventListener("touchstart", () => { this.touchStartTime = Date.now(); }, { passive: true });
    document.addEventListener("touchend", () => {
      if (Date.now() - this.touchStartTime > 1000) this.longPresses++;
    }, { passive: true });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const smallButtons = document.querySelectorAll("button, a[role='button'], [role='button']");
    let tooSmall = 0;
    smallButtons.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && (rect.width < 32 || rect.height < 32)) {
        tooSmall++;
      }
    });
    if (tooSmall > 5) {
      findings.push(`${tooSmall} touch targets below 32px — accessibility issue`);
    }

    if (this.longPresses > 5) {
      findings.push(`${this.longPresses} long presses detected — possible confusion`);
      this.longPresses = 0;
    }

    const inputs = document.querySelectorAll("input, textarea, select");
    let noLabel = 0;
    inputs.forEach(el => {
      const id = el.getAttribute("id");
      const ariaLabel = el.getAttribute("aria-label");
      const label = id ? document.querySelector(`label[for="${id}"]`) : null;
      if (!label && !ariaLabel) noLabel++;
    });
    if (noLabel > 3) {
      findings.push(`${noLabel} form inputs without labels — accessibility gap`);
    }

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
