import { platformBus } from "@/lib/shared/platform-bus";
import { recordObservabilityProof } from "./observability";

export interface CircuitBreakerConfig {
  maxAttemptsPerEntity: number;
  cooldownMs: number;
  maxRepairsPerWindow: number;
  windowMs: number;
  maxCascadeDepth: number;
  stormThreshold: number;
  stormWindowMs: number;
  stormCooldownMs: number;
}

interface EntityAttemptRecord {
  entityId: string;
  attempts: number;
  lastAttemptAt: number;
  cooldownUntil: number;
  cascadeDepth: number;
}

interface StormState {
  active: boolean;
  eventCount: number;
  windowStart: number;
  cooldownUntil: number;
  level: "none" | "warning" | "active" | "critical";
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  maxAttemptsPerEntity: 5,
  cooldownMs: 60_000,
  maxRepairsPerWindow: 100,
  windowMs: 300_000,
  maxCascadeDepth: 3,
  stormThreshold: 50,
  stormWindowMs: 60_000,
  stormCooldownMs: 300_000,
};

let config: CircuitBreakerConfig = { ...DEFAULT_CONFIG };
const entityAttempts = new Map<string, EntityAttemptRecord>();
let windowRepairCount = 0;
let windowStart = Date.now();

const storm: StormState = {
  active: false,
  eventCount: 0,
  windowStart: Date.now(),
  cooldownUntil: 0,
  level: "none",
};

const cascadeStack: string[] = [];
const MAX_CASCADE_STACK = 100;

export function configureCircuitBreakers(partial: Partial<CircuitBreakerConfig>): void {
  config = { ...config, ...partial };
}

export function getCircuitBreakerConfig(): CircuitBreakerConfig {
  return { ...config };
}

function rotateWindow(): void {
  if (Date.now() - windowStart > config.windowMs) {
    windowRepairCount = 0;
    windowStart = Date.now();
  }
}

function rotateStormWindow(): void {
  if (Date.now() - storm.windowStart > config.stormWindowMs) {
    storm.eventCount = 0;
    storm.windowStart = Date.now();
    if (storm.active && Date.now() >= storm.cooldownUntil) {
      storm.active = false;
      storm.level = "none";
      recordObservabilityProof({
        id: `proof-storm-lifted-${Date.now()}`,
        source: "circuit-breaker",
        category: "circuit_breaker",
        timestamp: new Date().toISOString(),
        what: "Storm protection lifted",
        why: "Cooldown period expired",
        where: "circuit-breaker",
        correction: "Repairs re-enabled",
        fallbackUsed: false,
        rollbackUsed: false,
        recurrenceRisk: "medium",
      });
    }
  }
}

export function canAttemptRepair(entityId: string, cascadeDepth = 0): {
  allowed: boolean;
  reason: string;
} {
  rotateWindow();
  rotateStormWindow();

  if (storm.active && Date.now() < storm.cooldownUntil) {
    return { allowed: false, reason: `Storm protection active (level=${storm.level}), cooldown until ${new Date(storm.cooldownUntil).toISOString()}` };
  }

  if (windowRepairCount >= config.maxRepairsPerWindow) {
    return { allowed: false, reason: `Window repair limit reached (${windowRepairCount}/${config.maxRepairsPerWindow})` };
  }

  if (cascadeDepth > config.maxCascadeDepth) {
    return { allowed: false, reason: `Cascade depth ${cascadeDepth} exceeds max ${config.maxCascadeDepth}` };
  }

  const record = entityAttempts.get(entityId);
  if (record) {
    if (Date.now() < record.cooldownUntil) {
      const remainMs = record.cooldownUntil - Date.now();
      return { allowed: false, reason: `Entity ${entityId} on cooldown (${Math.round(remainMs / 1000)}s remaining)` };
    }

    if (record.attempts >= config.maxAttemptsPerEntity) {
      return { allowed: false, reason: `Entity ${entityId} exhausted max attempts (${record.attempts}/${config.maxAttemptsPerEntity})` };
    }
  }

  return { allowed: true, reason: "Allowed" };
}

export function recordRepairAttempt(entityId: string, success: boolean, cascadeDepth = 0): void {
  rotateWindow();
  windowRepairCount++;

  let record = entityAttempts.get(entityId);
  if (!record) {
    record = {
      entityId,
      attempts: 0,
      lastAttemptAt: 0,
      cooldownUntil: 0,
      cascadeDepth: 0,
    };
    entityAttempts.set(entityId, record);
  }

  record.attempts++;
  record.lastAttemptAt = Date.now();
  record.cascadeDepth = cascadeDepth;

  if (!success) {
    const backoff = Math.min(config.cooldownMs * Math.pow(2, record.attempts - 1), 3_600_000);
    record.cooldownUntil = Date.now() + backoff;
  }

  storm.eventCount++;
  updateStormLevel();

  cascadeStack.push(entityId);
  if (cascadeStack.length > MAX_CASCADE_STACK) {
    cascadeStack.splice(0, cascadeStack.length - MAX_CASCADE_STACK);
  }

  if (entityAttempts.size > 10_000) {
    const cutoff = Date.now() - config.windowMs;
    for (const [key, val] of entityAttempts) {
      if (val.lastAttemptAt < cutoff) entityAttempts.delete(key);
    }
  }
}

function updateStormLevel(): void {
  const ratio = storm.eventCount / config.stormThreshold;

  if (ratio >= 1.5) {
    if (storm.level !== "critical") {
      storm.level = "critical";
      storm.active = true;
      storm.cooldownUntil = Date.now() + config.stormCooldownMs * 2;
      emitStormEvent("critical");
    }
  } else if (ratio >= 1.0) {
    if (storm.level !== "active") {
      storm.level = "active";
      storm.active = true;
      storm.cooldownUntil = Date.now() + config.stormCooldownMs;
      emitStormEvent("active");
    }
  } else if (ratio >= 0.7) {
    if (storm.level !== "warning") {
      storm.level = "warning";
      emitStormEvent("warning");
    }
  }
}

function emitStormEvent(level: string): void {
  recordObservabilityProof({
    id: `proof-storm-${level}-${Date.now()}`,
    source: "circuit-breaker",
    category: "circuit_breaker",
    timestamp: new Date().toISOString(),
    what: `Storm protection triggered: ${level}`,
    why: `${storm.eventCount} events in ${Math.round((Date.now() - storm.windowStart) / 1000)}s (threshold: ${config.stormThreshold})`,
    where: "circuit-breaker",
    correction: level === "critical"
      ? "All repairs suspended, cooldown doubled"
      : level === "active"
        ? "All repairs suspended"
        : "Storm warning, repairs proceeding with caution",
    fallbackUsed: false,
    rollbackUsed: false,
    recurrenceRisk: "high",
    metadata: { level, eventCount: storm.eventCount, threshold: config.stormThreshold },
  });

  platformBus.emit("enforcement:storm_detected", {
    level,
    eventCount: storm.eventCount,
    cooldownUntil: storm.cooldownUntil,
  }, "system");
}

export function detectInfiniteLoop(entityId: string, windowSize = 10): boolean {
  const recent = cascadeStack.slice(-windowSize);
  const occurrences = recent.filter((id) => id === entityId).length;
  return occurrences >= 3;
}

export function isStormActive(): boolean {
  rotateStormWindow();
  return storm.active && Date.now() < storm.cooldownUntil;
}

export function getStormState(): {
  active: boolean;
  level: string;
  eventCount: number;
  cooldownUntil: number;
} {
  return {
    active: storm.active,
    level: storm.level,
    eventCount: storm.eventCount,
    cooldownUntil: storm.cooldownUntil,
  };
}

export function getCircuitBreakerStats(): {
  trackedEntities: number;
  windowRepairCount: number;
  stormActive: boolean;
  stormLevel: string;
  stormEventCount: number;
  cooldownEntities: number;
  exhaustedEntities: number;
  cascadeStackSize: number;
} {
  const now = Date.now();
  let cooldownEntities = 0;
  let exhaustedEntities = 0;

  for (const record of entityAttempts.values()) {
    if (now < record.cooldownUntil) cooldownEntities++;
    if (record.attempts >= config.maxAttemptsPerEntity) exhaustedEntities++;
  }

  return {
    trackedEntities: entityAttempts.size,
    windowRepairCount,
    stormActive: storm.active,
    stormLevel: storm.level,
    stormEventCount: storm.eventCount,
    cooldownEntities,
    exhaustedEntities,
    cascadeStackSize: cascadeStack.length,
  };
}

export function resetCircuitBreakers(): void {
  entityAttempts.clear();
  windowRepairCount = 0;
  windowStart = Date.now();
  storm.active = false;
  storm.eventCount = 0;
  storm.windowStart = Date.now();
  storm.cooldownUntil = 0;
  storm.level = "none";
  cascadeStack.length = 0;
}
