import { platformBus } from "@/lib/shared/platform-bus";
import { sendSentinelToOmega } from "@/core/protocols/agent-protocol";

export interface E2EFailure {
  testName: string;
  suiteName: string;
  error: string;
  pillar?: string;
  timestamp: number;
}

const _recentFailures: E2EFailure[] = [];
const MAX_FAILURES = 100;

export function reportE2EFailure(failure: E2EFailure): string {
  _recentFailures.push(failure);
  if (_recentFailures.length > MAX_FAILURES) _recentFailures.shift();

  platformBus.emit("e2e:test_failed", failure, "e2e-auto-repair");

  const correlationId = sendSentinelToOmega({
    issueId: `e2e-fail:${failure.suiteName}:${failure.testName}`,
    severity: "high",
    affectedDomain: failure.pillar ?? "platform",
    description: `E2E test "${failure.testName}" in suite "${failure.suiteName}" failed: ${failure.error}`,
    affectedEntities: [failure.testName],
    metadata: { testName: failure.testName, suiteName: failure.suiteName, error: failure.error, detectedAt: failure.timestamp },
  });

  return correlationId;
}

export function reportE2ESuccess(testName: string, suiteName: string): void {
  platformBus.emit("e2e:test_passed", { testName, suiteName, timestamp: Date.now() }, "e2e-auto-repair");
}

export function getRecentE2EFailures(): readonly E2EFailure[] {
  return _recentFailures;
}

export function installE2EAutoRepairWire(): () => void {
  const unsub = platformBus.on("e2e:test_failed", (event) => {
    const p = event.payload as E2EFailure;
    if (import.meta.env?.DEV) {
      console.warn(`[e2e-auto-repair] Test failure detected: ${p.testName} — routing to orchestrator`);
    }
  });
  return unsub;
}
