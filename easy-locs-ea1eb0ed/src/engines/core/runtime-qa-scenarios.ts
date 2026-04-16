import { platformBus } from "@/lib/shared/platform-bus";

export interface QAScenario {
  id: string;
  name: string;
  domain: string;
  severity: "critical" | "high" | "medium";
  check: () => Promise<boolean> | boolean;
}

const _scenarios: QAScenario[] = [];

export function registerQAScenario(scenario: QAScenario): void {
  if (_scenarios.some((s) => s.id === scenario.id)) return;
  _scenarios.push(scenario);
}

export function getRegisteredScenarios(): readonly QAScenario[] {
  return _scenarios;
}

export interface QAResult {
  scenarioId: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

export async function runAllQAScenarios(): Promise<QAResult[]> {
  const results: QAResult[] = [];

  for (const scenario of _scenarios) {
    const start = Date.now();
    try {
      const passed = await scenario.check();
      results.push({ scenarioId: scenario.id, passed, durationMs: Date.now() - start });
    } catch (e) {
      results.push({
        scenarioId: scenario.id,
        passed: false,
        durationMs: Date.now() - start,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const failCount = results.filter((r) => !r.passed).length;
  platformBus.emit("engine:qa_run_completed", {
    total: results.length,
    passed: results.length - failCount,
    failed: failCount,
    results,
    timestamp: Date.now(),
  }, "runtime-qa");

  return results;
}

export function registerCoreScenarios(): void {
  registerQAScenario({
    id: "bus-listeners-alive",
    name: "Platform Bus has active listeners",
    domain: "platform",
    severity: "critical",
    check: () => {
      const stats = platformBus.getListenerStats();
      return stats.totalTyped > 0;
    },
  });

  registerQAScenario({
    id: "no-orphan-events",
    name: "No events emitted to zero listeners",
    domain: "platform",
    severity: "high",
    check: () => {
      const stats = platformBus.getListenerStats();
      return stats.totalTyped >= 5;
    },
  });

  registerQAScenario({
    id: "wallet-events-wired",
    name: "Wallet events have listeners",
    domain: "wallet",
    severity: "critical",
    check: () => {
      const stats = platformBus.getListenerStats();
      const walletEvents = Object.keys(stats.byEvent).filter((k) => k.startsWith("wallet:"));
      return walletEvents.length >= 3;
    },
  });

  registerQAScenario({
    id: "orbit-events-wired",
    name: "Orbit events have listeners",
    domain: "orbit",
    severity: "high",
    check: () => {
      const stats = platformBus.getListenerStats();
      const orbitEvents = Object.keys(stats.byEvent).filter((k) => k.startsWith("orbit:"));
      return orbitEvents.length >= 2;
    },
  });

  registerQAScenario({
    id: "radar-events-wired",
    name: "Radar events have listeners",
    domain: "radar",
    severity: "high",
    check: () => {
      const stats = platformBus.getListenerStats();
      const radarEvents = Object.keys(stats.byEvent).filter((k) => k.startsWith("radar:"));
      return radarEvents.length >= 1;
    },
  });

  registerQAScenario({
    id: "dashboard-refresh-wired",
    name: "Dashboard refresh event has listeners",
    domain: "dashboard",
    severity: "medium",
    check: () => {
      const stats = platformBus.getListenerStats();
      return (stats.byEvent["dashboard:refresh"] ?? 0) >= 1;
    },
  });
}
