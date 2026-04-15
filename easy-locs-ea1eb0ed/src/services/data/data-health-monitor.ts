const HEALTH_CHECK_MS = 60_000;

interface ServiceHealth {
  name: string;
  expectedIntervalMs: number;
  getLastUpdate: () => number | null;
  restart: () => void;
}

const services: ServiceHealth[] = [];
let _healthTimer: ReturnType<typeof setInterval> | null = null;

export function registerHealthTarget(target: ServiceHealth): void {
  const existing = services.findIndex(s => s.name === target.name);
  if (existing >= 0) {
    services[existing] = target;
  } else {
    services.push(target);
  }
}

function checkHealth(): void {
  const now = Date.now();
  for (const svc of services) {
    const lastUpdate = svc.getLastUpdate();
    if (lastUpdate === null) {
      console.warn(`[health-monitor] ${svc.name}: never produced data, restarting`);
      try {
        svc.restart();
      } catch (err) {
        console.warn(`[health-monitor] ${svc.name}: restart failed`, err);
      }
      continue;
    }

    const staleness = now - lastUpdate;
    const threshold = svc.expectedIntervalMs * 3;
    if (staleness > threshold) {
      console.warn(`[health-monitor] ${svc.name}: stale by ${Math.round(staleness / 1000)}s (threshold ${Math.round(threshold / 1000)}s), restarting`);
      try {
        svc.restart();
        emitRecoveryEvent(svc.name, staleness);
      } catch (err) {
        console.warn(`[health-monitor] ${svc.name}: restart failed`, err);
      }
    }
  }
}

function emitRecoveryEvent(serviceName: string, stalenessMs: number): void {
  import("@/lib/shared/platform-bus").then(({ platformBus }) => {
    platformBus.emit("health:service:recovered", {
      service: serviceName,
      stalenessMs,
      recoveredAt: Date.now(),
    }, "system");
  }).catch(err => {
    console.warn("[health-monitor] Failed to emit recovery event:", err);
  });
}

export function startHealthMonitor(intervalMs = HEALTH_CHECK_MS): () => void {
  if (_healthTimer) return () => {};
  console.log("[health-monitor] Starting data health monitor");
  setTimeout(checkHealth, 30_000);
  _healthTimer = setInterval(checkHealth, intervalMs);
  return () => {
    if (_healthTimer) {
      clearInterval(_healthTimer);
      _healthTimer = null;
    }
  };
}

export function getHealthReport(): Array<{ name: string; lastUpdate: number | null; stale: boolean }> {
  const now = Date.now();
  return services.map(svc => {
    const lastUpdate = svc.getLastUpdate();
    return {
      name: svc.name,
      lastUpdate,
      stale: lastUpdate === null || (now - lastUpdate) > svc.expectedIntervalMs * 3,
    };
  });
}
