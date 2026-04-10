import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { platformBus } from "@/lib/shared/platform-bus";

interface RollbackEntry {
  domain: string;
  reason: string;
  action: string;
  timestamp: number;
}

export class RollbackEngine extends BaseEngine {
  private history: RollbackEntry[] = [];
  private errorBursts: Map<string, number[]> = new Map();

  constructor() {
    super({
      id: "sh-rollback",
      name: "Rollback Engine",
      category: "self-healing",
      intervalMs: 30_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];
    const actions: string[] = [];

    const eventLog = (platformBus as any).log as Array<{ type: string; ts: number }> | undefined;
    if (eventLog) {
      const errorEvents = eventLog.filter(
        (e: any) => e.type?.includes("error") || e.type?.includes("failed")
      );
      const recent = errorEvents.filter((e: any) => {
        const ts = e.ts || 0;
        return Date.now() - ts < 60_000;
      });

      if (recent.length > 20) {
        findings.push(`Error burst: ${recent.length} error events in last 60s`);

        const domains = new Set(recent.map((e: any) => e.type.split(":")[0].split(".")[0]));
        for (const domain of domains) {
          const timestamps = this.errorBursts.get(domain) || [];
          timestamps.push(Date.now());
          this.errorBursts.set(domain, timestamps.slice(-10));

          if (timestamps.length >= 5) {
            findings.push(`Domain "${domain}" in critical error state — rollback candidate`);
            this.history.push({
              domain,
              reason: `${timestamps.length} error bursts detected`,
              action: "flagged-for-review",
              timestamp: Date.now(),
            });
          }
        }
      }
    }

    if (this.history.length > 200) this.history = this.history.slice(-200);

    return { level: findings.length > 0 ? "propose" : "observe", findings: findings.length, actions, duration: 0 };
  }
}
