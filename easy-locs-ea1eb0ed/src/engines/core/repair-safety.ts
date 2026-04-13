import { platformBus } from "@/lib/shared/platform-bus";
import { engineObserver } from "./engine-observer";

export type RepairOperation = "invalidate" | "refresh" | "reset" | "reconnect" | "fallback" | "suppress";

export type QuarantineStatus = "active" | "quarantined" | "frozen";

interface RepairAttempt {
  engineId: string;
  domain: string;
  issueSignature: string;
  repairChainId: string;
  timestamp: number;
}

interface QuarantineEntry {
  id: string;
  scope: "engine" | "domain";
  reason: string;
  startedAt: number;
  consecutiveRollbacks: number;
  autoRecoveryAt: number | null;
  frozen: boolean;
}

interface RepairChainEntry {
  chainId: string;
  issueSignature: string;
  iterations: number;
  firstSeen: number;
  lastSeen: number;
}

const GLOBAL_STORM_LIMIT = 50;
const GLOBAL_STORM_WINDOW_MS = 60_000;
const GLOBAL_STORM_COOLDOWN_MS = 300_000;

const PER_ENGINE_LIMIT = 10;
const PER_ENGINE_WINDOW_MS = 300_000;

const PER_DOMAIN_LIMIT = 20;
const PER_DOMAIN_WINDOW_MS = 300_000;

const PER_ISSUE_LIMIT = 3;
const PER_ISSUE_WINDOW_MS = 300_000;

const CIRCULAR_LOOP_THRESHOLD = 3;

const QUARANTINE_AUTO_RECOVERY_MS = 1_800_000;
const QUARANTINE_HEALTH_CHECK_INTERVAL_MS = 300_000;

const FREEZE_THRESHOLDS = [
  { rollbacks: 3, durationMs: 900_000 },
  { rollbacks: 5, durationMs: 3_600_000 },
  { rollbacks: 10, durationMs: -1 },
];

const ALLOWED_OPERATIONS: Set<RepairOperation> = new Set([
  "invalidate", "refresh", "reset", "reconnect", "fallback", "suppress",
]);

const ENGINE_MANIFEST: Set<string> = new Set();

let manifestSealed = false;

const globalRepairLog: RepairAttempt[] = [];
const repairChains = new Map<string, RepairChainEntry>();
const quarantineMap = new Map<string, QuarantineEntry>();

let stormActive = false;
let stormCooldownUntil = 0;

export function registerInManifest(engineId: string): void {
  ENGINE_MANIFEST.add(engineId);
}

export function registerAllInManifest(engineIds: string[]): void {
  for (const id of engineIds) registerInManifest(id);
}

export function sealManifest(): void {
  manifestSealed = true;
}

export function isInManifest(engineId: string): boolean {
  if (!manifestSealed) return true;
  return ENGINE_MANIFEST.has(engineId);
}

export function getManifestSize(): number {
  return ENGINE_MANIFEST.size;
}

export function isOperationAllowed(operation: string): boolean {
  return ALLOWED_OPERATIONS.has(operation as RepairOperation);
}

function pruneOldAttempts(windowMs: number): void {
  const cutoff = Date.now() - windowMs;
  while (globalRepairLog.length > 0 && globalRepairLog[0].timestamp < cutoff) {
    globalRepairLog.shift();
  }
}

export function isRepairStormActive(): boolean {
  if (stormActive && Date.now() < stormCooldownUntil) return true;
  if (stormActive && Date.now() >= stormCooldownUntil) {
    stormActive = false;
    engineObserver.log("repair-safety", "repair-safety", "info", "Repair storm cooldown ended");
  }
  return false;
}

function checkGlobalStorm(): boolean {
  pruneOldAttempts(GLOBAL_STORM_WINDOW_MS);
  if (globalRepairLog.length >= GLOBAL_STORM_LIMIT) {
    if (!stormActive) {
      stormActive = true;
      stormCooldownUntil = Date.now() + GLOBAL_STORM_COOLDOWN_MS;
      engineObserver.log("repair-safety", "repair-safety", "error",
        `Repair storm detected: ${globalRepairLog.length} repairs in ${GLOBAL_STORM_WINDOW_MS / 1000}s — all engines to L1 for ${GLOBAL_STORM_COOLDOWN_MS / 1000}s`);
      platformBus.emit("repair:storm:detected", {
        count: globalRepairLog.length,
        cooldownUntil: stormCooldownUntil,
      });
    }
    return true;
  }
  return false;
}

type StormGuardCheck = (engineId: string) => boolean;
let _stormGuardCheck: StormGuardCheck | null = null;

export function registerStormGuardCheck(fn: StormGuardCheck): void {
  _stormGuardCheck = fn;
}

export function canAttemptRepair(engineId: string, domain: string, issueSignature: string): boolean {
  if (isRepairStormActive()) return false;
  if (isQuarantined(engineId)) return false;
  if (isQuarantined(`domain:${domain}`)) return false;

  if (_stormGuardCheck && _stormGuardCheck(engineId)) return false;

  const now = Date.now();

  const engineCount = globalRepairLog.filter(
    a => a.engineId === engineId && now - a.timestamp < PER_ENGINE_WINDOW_MS
  ).length;
  if (engineCount >= PER_ENGINE_LIMIT) return false;

  const domainCount = globalRepairLog.filter(
    a => a.domain === domain && now - a.timestamp < PER_DOMAIN_WINDOW_MS
  ).length;
  if (domainCount >= PER_DOMAIN_LIMIT) return false;

  const issueCount = globalRepairLog.filter(
    a => a.issueSignature === issueSignature && now - a.timestamp < PER_ISSUE_WINDOW_MS
  ).length;
  if (issueCount >= PER_ISSUE_LIMIT) return false;

  return true;
}

export function recordRepairAttempt(
  engineId: string,
  domain: string,
  issueSignature: string,
  repairChainId: string
): void {
  globalRepairLog.push({
    engineId,
    domain,
    issueSignature,
    repairChainId,
    timestamp: Date.now(),
  });

  if (globalRepairLog.length > 500) {
    globalRepairLog.splice(0, globalRepairLog.length - 500);
  }

  checkGlobalStorm();
  trackRepairChain(repairChainId, issueSignature);
}

function trackRepairChain(chainId: string, issueSignature: string): void {
  const existing = repairChains.get(chainId);
  if (existing) {
    if (existing.issueSignature === issueSignature) {
      existing.iterations++;
      existing.lastSeen = Date.now();

      if (existing.iterations >= CIRCULAR_LOOP_THRESHOLD) {
        engineObserver.log("repair-safety", "repair-safety", "error",
          `Circular repair loop detected: chain=${chainId} sig=${issueSignature} iterations=${existing.iterations}`);
        platformBus.emit("repair:loop:detected", {
          chainId,
          issueSignature,
          iterations: existing.iterations,
        });
      }
    }
  } else {
    repairChains.set(chainId, {
      chainId,
      issueSignature,
      iterations: 1,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
    });
  }

  if (repairChains.size > 200) {
    const cutoff = Date.now() - 600_000;
    for (const [k, v] of repairChains) {
      if (v.lastSeen < cutoff) repairChains.delete(k);
    }
  }
}

export function isCircularLoop(repairChainId: string): boolean {
  const entry = repairChains.get(repairChainId);
  return entry ? entry.iterations >= CIRCULAR_LOOP_THRESHOLD : false;
}

export function quarantineEngine(engineId: string, reason: string, consecutiveRollbacks = 0): void {
  const frozen = determineFreezeState(consecutiveRollbacks);
  const autoRecoveryMs = frozen
    ? getFreezeAutoRecovery(consecutiveRollbacks)
    : QUARANTINE_AUTO_RECOVERY_MS;

  quarantineMap.set(engineId, {
    id: engineId,
    scope: "engine",
    reason,
    startedAt: Date.now(),
    consecutiveRollbacks,
    autoRecoveryAt: autoRecoveryMs > 0 ? Date.now() + autoRecoveryMs : null,
    frozen,
  });

  engineObserver.log("repair-safety", "repair-safety", "warn",
    `Engine ${frozen ? "frozen" : "quarantined"}: ${engineId} — ${reason}`);
  platformBus.emit("repair:quarantine:entered", {
    id: engineId,
    scope: "engine",
    reason,
    frozen,
  });
}

export function quarantineDomain(domain: string, reason: string): void {
  const key = `domain:${domain}`;
  quarantineMap.set(key, {
    id: key,
    scope: "domain",
    reason,
    startedAt: Date.now(),
    consecutiveRollbacks: 0,
    autoRecoveryAt: Date.now() + QUARANTINE_AUTO_RECOVERY_MS,
    frozen: false,
  });

  engineObserver.log("repair-safety", "repair-safety", "warn",
    `Domain quarantined: ${domain} — ${reason}`);
  platformBus.emit("repair:quarantine:entered", {
    id: key,
    scope: "domain",
    reason,
    frozen: false,
  });
}

export function isQuarantined(id: string): boolean {
  const entry = quarantineMap.get(id);
  if (!entry) return false;

  if (entry.autoRecoveryAt && Date.now() >= entry.autoRecoveryAt) {
    quarantineMap.delete(id);
    engineObserver.log("repair-safety", "repair-safety", "info",
      `Auto-recovery: ${id} released from ${entry.frozen ? "freeze" : "quarantine"}`);
    platformBus.emit("repair:quarantine:lifted", { id, autoRecovered: true });
    return false;
  }

  return true;
}

export function liftQuarantine(id: string): void {
  if (quarantineMap.has(id)) {
    quarantineMap.delete(id);
    engineObserver.log("repair-safety", "repair-safety", "info",
      `Manual quarantine lift: ${id}`);
    platformBus.emit("repair:quarantine:lifted", { id, autoRecovered: false });
  }
}

export function getQuarantineStatus(id: string): QuarantineStatus {
  const entry = quarantineMap.get(id);
  if (!entry) return "active";
  if (entry.autoRecoveryAt && Date.now() >= entry.autoRecoveryAt) {
    quarantineMap.delete(id);
    return "active";
  }
  return entry.frozen ? "frozen" : "quarantined";
}

function determineFreezeState(consecutiveRollbacks: number): boolean {
  for (const threshold of FREEZE_THRESHOLDS) {
    if (consecutiveRollbacks >= threshold.rollbacks) return true;
  }
  return false;
}

function getFreezeAutoRecovery(consecutiveRollbacks: number): number {
  for (let i = FREEZE_THRESHOLDS.length - 1; i >= 0; i--) {
    if (consecutiveRollbacks >= FREEZE_THRESHOLDS[i].rollbacks) {
      return FREEZE_THRESHOLDS[i].durationMs;
    }
  }
  return QUARANTINE_AUTO_RECOVERY_MS;
}

export function getRepairSafetyReport() {
  const now = Date.now();
  pruneOldAttempts(GLOBAL_STORM_WINDOW_MS);

  const activeQuarantines = Array.from(quarantineMap.entries())
    .filter(([, e]) => !e.autoRecoveryAt || now < e.autoRecoveryAt)
    .map(([id, e]) => ({
      id,
      scope: e.scope,
      reason: scrubSensitiveData(e.reason),
      frozen: e.frozen,
      startedAt: e.startedAt,
      autoRecoveryAt: e.autoRecoveryAt,
      durationMs: now - e.startedAt,
    }));

  const activeChains = Array.from(repairChains.values())
    .filter(c => now - c.lastSeen < 600_000)
    .map(c => ({
      chainId: c.chainId,
      issueSignature: c.issueSignature,
      iterations: c.iterations,
      isLoop: c.iterations >= CIRCULAR_LOOP_THRESHOLD,
    }));

  return {
    stormActive,
    stormCooldownUntil: stormActive ? stormCooldownUntil : null,
    repairsInWindow: globalRepairLog.filter(a => now - a.timestamp < GLOBAL_STORM_WINDOW_MS).length,
    stormThreshold: GLOBAL_STORM_LIMIT,
    activeQuarantines,
    activeChains,
    manifestSize: ENGINE_MANIFEST.size,
    manifestSealed,
    activationSheets: Array.from(activationSheets.keys()),
    limits: {
      globalStorm: `${GLOBAL_STORM_LIMIT}/${GLOBAL_STORM_WINDOW_MS / 1000}s`,
      perEngine: `${PER_ENGINE_LIMIT}/${PER_ENGINE_WINDOW_MS / 1000}s`,
      perDomain: `${PER_DOMAIN_LIMIT}/${PER_DOMAIN_WINDOW_MS / 1000}s`,
      perIssue: `${PER_ISSUE_LIMIT}/${PER_ISSUE_WINDOW_MS / 1000}s`,
      circularLoopThreshold: CIRCULAR_LOOP_THRESHOLD,
    },
  };
}

export interface DomainActivationSheet {
  domain: string;
  version: number;
  activeEngines: string[];
  allowedL2Operations: RepairOperation[];
  requiredL3Operations: string[];
  forbiddenOperations: string[];
  killSwitches: string[];
  rollbackTriggers: string[];
  freezeTriggers: string[];
  approvedAt: number;
  approvedBy: string;
}

const activationSheets = new Map<string, DomainActivationSheet>();

export function registerActivationSheet(sheet: DomainActivationSheet): void {
  activationSheets.set(sheet.domain, sheet);
}

export function getActivationSheet(domain: string): DomainActivationSheet | undefined {
  return activationSheets.get(domain);
}

export function hasDomainActivationSheet(domain: string): boolean {
  return activationSheets.has(domain);
}

export function getAllActivationSheets(): DomainActivationSheet[] {
  return Array.from(activationSheets.values());
}

export function isDomainOperationAllowed(domain: string, operation: string, repairLevel?: string): boolean {
  const sheet = activationSheets.get(domain);
  if (!sheet) return false;
  if (sheet.forbiddenOperations.includes(operation)) return false;
  if (!isOperationAllowed(operation)) return false;

  const level = repairLevel ?? "L2";

  if (level === "L2") {
    return sheet.allowedL2Operations.includes(operation as RepairOperation);
  }

  if (level === "L3") {
    return sheet.requiredL3Operations.includes(operation);
  }

  return false;
}

const SENSITIVE_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+/g,
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
];

export function scrubSensitiveData(input: string): string {
  let result = input;
  for (const pattern of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, "[redacted]");
  }
  return result;
}

export function resetRepairSafety(): void {
  globalRepairLog.length = 0;
  repairChains.clear();
  quarantineMap.clear();
  stormActive = false;
  stormCooldownUntil = 0;
}
