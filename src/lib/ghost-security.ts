/**
 * Ghost Security — Hardened ghost mode mechanics.
 * 
 * Adds production-grade features missing from base app-security.ts:
 * - Session TTL with auto-expiry
 * - Secure memory purge (overwrite-before-clear)
 * - Ghost session key isolation
 * - Heartbeat suppression registry
 */

const GHOST_TTL_KEY = "orbit:ghost-ttl-expiry";
const GHOST_SESSION_KEY = "orbit:ghost-session-id";
const GHOST_HEARTBEAT_BLOCKED_KEY = "orbit:ghost-heartbeat-blocked";

// ─── TTL Management ──────────────────────────────────────

/** Default ghost session TTL: 15 minutes */
const DEFAULT_GHOST_TTL_MS = 15 * 60 * 1000;

/** Activate ghost mode with a TTL. After expiry, ghost auto-deactivates. */
export function activateGhostWithTTL(ttlMs: number = DEFAULT_GHOST_TTL_MS): void {
  const expiresAt = Date.now() + ttlMs;
  sessionStorage.setItem(GHOST_TTL_KEY, String(expiresAt));
  sessionStorage.setItem(GHOST_SESSION_KEY, crypto.randomUUID());
  sessionStorage.setItem(GHOST_HEARTBEAT_BLOCKED_KEY, "true");

  // Also set the base ghost flag
  sessionStorage.setItem("orbit:ghost-active", "true");
}

/** Check if ghost TTL has expired. Returns true if expired or not set. */
export function isGhostTTLExpired(): boolean {
  const raw = sessionStorage.getItem(GHOST_TTL_KEY);
  if (!raw) return true;
  return Date.now() > parseInt(raw, 10);
}

/** Get remaining ghost TTL in milliseconds, or 0 if expired. */
export function getGhostTTLRemaining(): number {
  const raw = sessionStorage.getItem(GHOST_TTL_KEY);
  if (!raw) return 0;
  const remaining = parseInt(raw, 10) - Date.now();
  return Math.max(0, remaining);
}

/** Extend ghost TTL by additional time. */
export function extendGhostTTL(additionalMs: number): void {
  const raw = sessionStorage.getItem(GHOST_TTL_KEY);
  if (!raw) return;
  const current = parseInt(raw, 10);
  sessionStorage.setItem(GHOST_TTL_KEY, String(current + additionalMs));
}

// ─── Heartbeat Suppression ────────────────────────────────

/** Check if heartbeats should be blocked (ghost mode active). */
export function isHeartbeatBlocked(): boolean {
  return sessionStorage.getItem(GHOST_HEARTBEAT_BLOCKED_KEY) === "true";
}

// ─── Secure Purge ─────────────────────────────────────────

/**
 * Securely purge a storage key by overwriting with random data before deletion.
 * Prevents forensic recovery of sensitive values from storage.
 */
function securePurgeKey(storage: Storage, key: string): void {
  try {
    const existing = storage.getItem(key);
    if (existing) {
      // Overwrite with random data of same length (minimum 64 chars)
      const overwriteLen = Math.max(existing.length, 64);
      const randomData = Array.from(
        crypto.getRandomValues(new Uint8Array(overwriteLen)),
        b => b.toString(16).padStart(2, "0")
      ).join("");
      storage.setItem(key, randomData);
      // Second pass with zeros
      storage.setItem(key, "0".repeat(overwriteLen));
    }
    storage.removeItem(key);
  } catch {
    // Fallback: just remove
    try { storage.removeItem(key); } catch { /* */ }
  }
}

/**
 * Securely purge all orbit-related keys from a storage.
 * Uses overwrite-before-delete to minimize forensic traces.
 */
export function securePurgeOrbitKeys(storage: Storage): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && key.startsWith("orbit:")) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    securePurgeKey(storage, key);
  }
}

/**
 * Full ghost deactivation with secure cleanup.
 * - Overwrites ghost session data before deletion
 * - Clears TTL, session ID, heartbeat block
 * - Does NOT wipe main app data (that's panic mode)
 */
export function deactivateGhostSecure(): void {
  securePurgeKey(sessionStorage, GHOST_TTL_KEY);
  securePurgeKey(sessionStorage, GHOST_SESSION_KEY);
  securePurgeKey(sessionStorage, GHOST_HEARTBEAT_BLOCKED_KEY);
  securePurgeKey(sessionStorage, "orbit:ghost-active");
}

// ─── Auto-Expiry Monitor ─────────────────────────────────

let ghostExpiryTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Start monitoring ghost TTL. When TTL expires, auto-deactivate ghost mode.
 * Returns cleanup function.
 */
export function startGhostTTLMonitor(onExpired?: () => void): () => void {
  if (ghostExpiryTimer) {
    clearInterval(ghostExpiryTimer);
  }

  ghostExpiryTimer = setInterval(() => {
    if (isGhostTTLExpired()) {
      deactivateGhostSecure();
      onExpired?.();
      if (ghostExpiryTimer) {
        clearInterval(ghostExpiryTimer);
        ghostExpiryTimer = null;
      }
    }
  }, 5000); // Check every 5 seconds

  return () => {
    if (ghostExpiryTimer) {
      clearInterval(ghostExpiryTimer);
      ghostExpiryTimer = null;
    }
  };
}

// ─── Ghost Session Validation ─────────────────────────────

/** Get current ghost session ID (unique per activation). */
export function getGhostSessionId(): string | null {
  return sessionStorage.getItem(GHOST_SESSION_KEY);
}

/** Validate that a ghost session is still active and not expired. */
export function validateGhostSession(): { valid: boolean; remainingMs: number } {
  const isActive = sessionStorage.getItem("orbit:ghost-active") === "true";
  if (!isActive) return { valid: false, remainingMs: 0 };

  const remaining = getGhostTTLRemaining();
  if (remaining <= 0) {
    deactivateGhostSecure();
    return { valid: false, remainingMs: 0 };
  }

  return { valid: true, remainingMs: remaining };
}
