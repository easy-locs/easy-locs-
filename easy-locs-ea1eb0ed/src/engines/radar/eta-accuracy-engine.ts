import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { platformBus } from "@/lib/shared/platform-bus";

interface ETAPrediction {
  orderId: string;
  predictedMinutes: number;
  createdAt: number;
}

export class ETAAccuracyEngine extends BaseEngine {
  private predictions: Map<string, ETAPrediction> = new Map();

  constructor() {
    super({
      id: "radar-eta-accuracy",
      name: "ETA Accuracy Engine",
      category: "radar",
      intervalMs: 30_000,
    });
    platformBus.on("delivery:eta_updated" as any, (p: any) => {
      if (p?.orderId && p?.eta) {
        this.predictions.set(p.orderId, {
          orderId: p.orderId,
          predictedMinutes: p.eta,
          createdAt: Date.now(),
        });
      }
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const etaEls = document.querySelectorAll("[data-eta-minutes]");
    etaEls.forEach(el => {
      const eta = parseInt(el.getAttribute("data-eta-minutes") || "0", 10);
      if (eta > 120) {
        findings.push(`High ETA: ${eta} minutes`);
      }
      if (eta < 0) {
        findings.push("Negative ETA displayed");
      }
    });

    for (const [id, pred] of this.predictions) {
      if (Date.now() - pred.createdAt > pred.predictedMinutes * 60_000 + 600_000) {
        findings.push(`ETA exceeded: order ${id.substring(0, 8)} — predicted ${pred.predictedMinutes}min`);
        this.predictions.delete(id);
      }
    }

    if (this.predictions.size > 200) {
      const sorted = [...this.predictions.entries()].sort((a, b) => b[1].createdAt - a[1].createdAt);
      this.predictions = new Map(sorted.slice(0, 100));
    }

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
