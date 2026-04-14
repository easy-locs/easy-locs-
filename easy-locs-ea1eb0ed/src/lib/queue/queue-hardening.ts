import { platformBus } from "@/lib/shared/platform-bus";

export interface QueueDedupEntry {
  fingerprint: string;
  queueKey: string;
  createdAt: number;
  expiresAt: number;
}

export interface PoisonMessage {
  queueKey: string;
  taskId: string;
  payloadHash: string;
  failureCount: number;
  lastError: string;
  quarantinedAt: number;
}

export interface QueueDomainState {
  domain: string;
  paused: boolean;
  pausedAt: number | null;
  pausedBy: string | null;
  reason: string | null;
}

export interface QueueDepthMetrics {
  queueKey: string;
  depth: number;
  oldestMessageAge: number;
  avgProcessingTime: number;
  poisonCount: number;
}

const DEDUP_WINDOW_MS = 300_000;
const POISON_THRESHOLD = 5;
const MAX_DEDUP_ENTRIES = 10_000;

const dedupWindow = new Map<string, QueueDedupEntry>();
const poisonMessages = new Map<string, PoisonMessage>();
const domainPauseState = new Map<string, QueueDomainState>();
const processingTimes = new Map<string, number[]>();
const MAX_PROCESSING_TIMES = 100;

export function computePayloadFingerprint(payload: Record<string, unknown>): string {
  const sorted = JSON.stringify(payload, Object.keys(payload).sort());
  let hash = 0;
  for (let i = 0; i < sorted.length; i++) {
    hash = ((hash << 5) - hash + sorted.charCodeAt(i)) | 0;
  }
  return `fp_${Math.abs(hash).toString(36)}`;
}

export function isDuplicate(queueKey: string, fingerprint: string): boolean {
  const key = `${queueKey}:${fingerprint}`;
  const entry = dedupWindow.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return true;
  }
  if (entry) {
    dedupWindow.delete(key);
  }
  return false;
}

export function recordDedup(queueKey: string, fingerprint: string): void {
  const key = `${queueKey}:${fingerprint}`;
  dedupWindow.set(key, {
    fingerprint,
    queueKey,
    createdAt: Date.now(),
    expiresAt: Date.now() + DEDUP_WINDOW_MS,
  });

  if (dedupWindow.size > MAX_DEDUP_ENTRIES) {
    const now = Date.now();
    for (const [k, v] of dedupWindow) {
      if (v.expiresAt < now) dedupWindow.delete(k);
    }
  }
}

export function computeStructuredBackoff(attempt: number, opts?: {
  baseMs?: number;
  maxMs?: number;
  jitterMs?: number;
}): number {
  const base = opts?.baseMs ?? 1000;
  const max = opts?.maxMs ?? 60_000;
  const jitter = opts?.jitterMs ?? 500;
  const delay = Math.min(base * Math.pow(2, attempt), max);
  return delay + Math.floor(Math.random() * jitter);
}

export function recordFailure(queueKey: string, taskId: string, error: string, payloadHash?: string): boolean {
  const key = `${queueKey}:${taskId}`;
  const hash = payloadHash ?? taskId;
  let poison = poisonMessages.get(key);

  if (!poison) {
    poison = {
      queueKey,
      taskId,
      payloadHash: hash,
      failureCount: 0,
      lastError: error,
      quarantinedAt: 0,
    };
    poisonMessages.set(key, poison);
  }

  poison.failureCount++;
  poison.lastError = error;

  if (poison.failureCount >= POISON_THRESHOLD) {
    poison.quarantinedAt = Date.now();

    platformBus.emit("queue:poison_detected", {
      queueKey,
      taskId,
      failureCount: poison.failureCount,
      lastError: error,
    }, "system");

    return true;
  }

  return false;
}

export function isPoisoned(queueKey: string, taskId: string): boolean {
  const key = `${queueKey}:${taskId}`;
  const poison = poisonMessages.get(key);
  return poison ? poison.failureCount >= POISON_THRESHOLD : false;
}

export function getPoisonMessages(): PoisonMessage[] {
  return Array.from(poisonMessages.values()).filter(p => p.failureCount >= POISON_THRESHOLD);
}

export function clearPoisonMessage(queueKey: string, taskId: string): void {
  poisonMessages.delete(`${queueKey}:${taskId}`);
}

export function pauseDomain(domain: string, reason: string, pausedBy = "system"): void {
  domainPauseState.set(domain, {
    domain,
    paused: true,
    pausedAt: Date.now(),
    pausedBy,
    reason,
  });

  platformBus.emit("queue:domain_paused", { domain, reason, pausedBy }, "system");
}

export function resumeDomain(domain: string): void {
  const state = domainPauseState.get(domain);
  if (state) {
    state.paused = false;
    state.pausedAt = null;
    state.pausedBy = null;
    state.reason = null;
  }

  platformBus.emit("queue:domain_resumed", { domain }, "system");
}

export function isDomainPaused(domain: string): boolean {
  return domainPauseState.get(domain)?.paused ?? false;
}

export function getDomainPauseStates(): QueueDomainState[] {
  return Array.from(domainPauseState.values());
}

export function recordProcessingTime(queueKey: string, durationMs: number): void {
  let times = processingTimes.get(queueKey);
  if (!times) {
    times = [];
    processingTimes.set(queueKey, times);
  }
  times.push(durationMs);
  if (times.length > MAX_PROCESSING_TIMES) {
    times.splice(0, times.length - MAX_PROCESSING_TIMES);
  }
}

export function getQueueDepthMetrics(queueKey: string, currentDepth: number): QueueDepthMetrics {
  const times = processingTimes.get(queueKey) ?? [];
  const avg = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  const poisonCount = Array.from(poisonMessages.values())
    .filter(p => p.queueKey === queueKey && p.failureCount >= POISON_THRESHOLD).length;

  return {
    queueKey,
    depth: currentDepth,
    oldestMessageAge: 0,
    avgProcessingTime: Math.round(avg),
    poisonCount,
  };
}

export function generateCorrelationId(): string {
  return `cor_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function cleanupExpiredEntries(): { dedupCleaned: number } {
  const now = Date.now();
  let dedupCleaned = 0;
  for (const [k, v] of dedupWindow) {
    if (v.expiresAt < now) {
      dedupWindow.delete(k);
      dedupCleaned++;
    }
  }
  return { dedupCleaned };
}

export function resetHardeningState(): void {
  dedupWindow.clear();
  poisonMessages.clear();
  domainPauseState.clear();
  processingTimes.clear();
}
