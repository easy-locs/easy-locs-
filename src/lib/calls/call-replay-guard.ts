/**
 * Call Replay Guard — Nonce tracking and anti-replay for call signaling.
 */
import { getCallSecurityPolicy, type CallSecurityTier } from "./call-security-policy";

const consumedNonces = new Map<string, number>();
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanupIfNeeded() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const cutoff = Date.now() - 10 * 60_000; // keep 10 min max
    for (const [k, t] of consumedNonces) {
      if (t < cutoff) consumedNonces.delete(k);
    }
    if (consumedNonces.size === 0 && cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  }, 30_000);
}

export function generateSignalNonce(): string {
  return crypto.randomUUID();
}

export function checkSignalReplay(nonce: string, tier: CallSecurityTier): { allowed: boolean; reason?: string } {
  const policy = getCallSecurityPolicy(tier);
  const now = Date.now();

  // Cleanup stale
  for (const [k, t] of consumedNonces) {
    if (now - t > policy.replayWindowMs) consumedNonces.delete(k);
  }

  if (consumedNonces.has(nonce)) {
    console.warn("[call-vault] signal_replay_blocked", { nonce });
    return { allowed: false, reason: "duplicate_nonce" };
  }

  consumedNonces.set(nonce, now);
  startCleanupIfNeeded();
  console.log("[call-vault] nonce_accepted", { nonce: nonce.slice(0, 8) });
  return { allowed: true };
}

export function checkSignalTimestamp(
  timestampMs: number,
  tier: CallSecurityTier
): { allowed: boolean; reason?: string } {
  const policy = getCallSecurityPolicy(tier);
  const drift = Math.abs(Date.now() - timestampMs);

  if (drift > policy.replayWindowMs) {
    console.warn("[call-vault] signal_expired", { drift, maxAllowed: policy.replayWindowMs });
    return { allowed: false, reason: "timestamp_drift" };
  }

  return { allowed: true };
}

export function generateReplayGuardHash(roomId: string, nonce: string, senderId: string): string {
  // Simple deterministic hash for server-side dedup
  const input = `${roomId}:${nonce}:${senderId}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

export function resetReplayGuard() {
  consumedNonces.clear();
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}
