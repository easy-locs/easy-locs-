import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { COMMISSION_RATES } from "@/lib/monetization-config";

export class CommissionEngine extends BaseEngine {
  constructor() {
    super({
      id: "commission-engine",
      name: "Commission Engine",
      category: "business",
      intervalMs: 120_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];
    const actions: string[] = [];

    const zeroEntries = Object.entries(COMMISSION_RATES).filter(([, r]) => r === 0);
    if (zeroEntries.length > 0) {
      findings.push(`${zeroEntries.length} order types have zero commission`);
    }

    const highEntries = Object.entries(COMMISSION_RATES).filter(([, r]) => r > 0.12);
    if (highEntries.length > 0) {
      findings.push(`${highEntries.length} order types have >12% commission — may impact provider retention`);
    }

    return { level: "detect", findings: findings.length, actions, duration: 0 };
  }
}
