import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class DropoffRepairEngine extends BaseEngine {
  private formStartTimes: Map<string, number> = new Map();

  constructor() {
    super({
      id: "biz-dropoff-repair",
      name: "Dropoff Repair Engine",
      category: "business",
      intervalMs: 30_000,
    });
    document.addEventListener("focusin", (e) => {
      const target = e.target as HTMLElement;
      const form = target?.closest("form");
      if (form) {
        const formId = form.id || form.getAttribute("data-form") || "anonymous";
        if (!this.formStartTimes.has(formId)) {
          this.formStartTimes.set(formId, Date.now());
        }
      }
    }, { passive: true });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    for (const [formId, startTime] of this.formStartTimes) {
      const elapsed = Date.now() - startTime;
      if (elapsed > 120_000) {
        findings.push(`Form "${formId}" started ${Math.round(elapsed / 60_000)}min ago — possible abandonment`);
      }
    }

    const forms = document.querySelectorAll("form");
    forms.forEach(form => {
      const inputs = form.querySelectorAll("input, select, textarea");
      let filled = 0;
      inputs.forEach(input => {
        if ((input as HTMLInputElement).value) filled++;
      });
      if (inputs.length > 3 && filled > 0 && filled < inputs.length / 2) {
        findings.push(`Partially filled form: ${filled}/${inputs.length} fields completed`);
      }
    });

    if (this.formStartTimes.size > 50) {
      const sorted = [...this.formStartTimes.entries()].sort((a, b) => b[1] - a[1]);
      this.formStartTimes = new Map(sorted.slice(0, 20));
    }

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
