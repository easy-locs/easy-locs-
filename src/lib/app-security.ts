/**
 * App Security Engine — PIN lock, panic PIN, ghost PIN, auto-wipe.
 * 
 * Security Modes:
 * - Normal: standard app access
 * - Secure: PIN/biometric lock required on open
 * - Ghost: alternate PIN opens a clean/empty interface
 * - Panic Wipe: special PIN triggers local data wipe + optional session revocation
 * 
 * HONEST LIMITATIONS (Web):
 * - Biometric auth: only via Web Authentication API (WebAuthn), not all browsers
 * - Screenshot block: NOT possible on web (CSS blur on tab switch only)
 * - App switcher hiding: NOT possible on web (Page Visibility API blur only)
 * - Local wipe: clears IndexedDB, localStorage, sessionStorage, CacheAPI, but NOT browser cache
 * - Native features (Face ID, app-level lock): require Capacitor/native wrapper
 */

import { supabase } from "@/integrations/supabase/client";
import { wipeAllKeys } from "./orbit-keystore";

// ─── Types ────────────────────────────────────────────────

export type SecurityMode = "normal" | "secure" | "ghost" | "panic_wipe";

export interface AppSecurityConfig {
  enabled: boolean;
  pin_hash: string | null;         // SHA-256 hash of main PIN
  ghost_pin_hash: string | null;   // SHA-256 hash of ghost PIN
  panic_pin_hash: string | null;   // SHA-256 hash of panic PIN
  max_attempts: number;            // Max wrong PINs before auto-wipe (default 10)
  auto_lock_on_background: boolean;
  auto_lock_delay_seconds: number; // Delay before lock on background (default 30)
  revoke_sessions_on_panic: boolean;
  wipe_on_max_attempts: boolean;
}

const DEFAULT_CONFIG: AppSecurityConfig = {
  enabled: false,
  pin_hash: null,
  ghost_pin_hash: null,
  panic_pin_hash: null,
  max_attempts: 10,
  auto_lock_on_background: true,
  auto_lock_delay_seconds: 30,
  revoke_sessions_on_panic: true,
  wipe_on_max_attempts: true,
};

const STORAGE_KEY = "orbit:security-config";
const ATTEMPTS_KEY = "orbit:pin-attempts";
const LOCK_STATE_KEY = "orbit:lock-state";
const GHOST_ACTIVE_KEY = "orbit:ghost-active";

// ─── Ghost Mode State ─────────────────────────────────────

/** Check if Ghost Mode is currently active (session-level) */
export function isGhostModeActive(): boolean {
  return sessionStorage.getItem(GHOST_ACTIVE_KEY) === "true";
}

/** Activate Ghost Mode — suppresses presence, hides financial data */
export function activateGhostMode(): void {
  sessionStorage.setItem(GHOST_ACTIVE_KEY, "true");
}

/** Deactivate Ghost Mode */
export function deactivateGhostMode(): void {
  sessionStorage.removeItem(GHOST_ACTIVE_KEY);
}

// ─── Hashing ──────────────────────────────────────────────

export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(hash);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ─── Config Persistence ───────────────────────────────────

export function getSecurityConfig(): AppSecurityConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveSecurityConfig(config: Partial<AppSecurityConfig>): void {
  const current = getSecurityConfig();
  const merged = { ...current, ...config };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
}

// ─── Lock State ───────────────────────────────────────────

export function isAppLocked(): boolean {
  const config = getSecurityConfig();
  if (!config.enabled || !config.pin_hash) return false;
  return sessionStorage.getItem(LOCK_STATE_KEY) !== "unlocked";
}

export function unlockApp(): void {
  sessionStorage.setItem(LOCK_STATE_KEY, "unlocked");
  resetAttempts();
}

export function lockApp(): void {
  sessionStorage.removeItem(LOCK_STATE_KEY);
}

// ─── Attempt Tracking ─────────────────────────────────────

export function getAttempts(): number {
  return parseInt(localStorage.getItem(ATTEMPTS_KEY) || "0", 10);
}

export function incrementAttempts(): number {
  const n = getAttempts() + 1;
  localStorage.setItem(ATTEMPTS_KEY, String(n));
  return n;
}

export function resetAttempts(): void {
  localStorage.removeItem(ATTEMPTS_KEY);
}

// ─── PIN Verification ─────────────────────────────────────

export type PinResult = 
  | { mode: "unlock"; success: true }
  | { mode: "ghost"; success: true }
  | { mode: "panic"; success: true }
  | { mode: "wrong"; success: false; attemptsLeft: number }
  | { mode: "wipe"; success: false; reason: "max_attempts" };

export async function verifyPin(pin: string): Promise<PinResult> {
  const config = getSecurityConfig();
  const pinHash = await hashPin(pin);

  // Check panic PIN first
  if (config.panic_pin_hash && pinHash === config.panic_pin_hash) {
    return { mode: "panic", success: true };
  }

  // Check ghost PIN
  if (config.ghost_pin_hash && pinHash === config.ghost_pin_hash) {
    return { mode: "ghost", success: true };
  }

  // Check main PIN
  if (config.pin_hash && pinHash === config.pin_hash) {
    resetAttempts();
    return { mode: "unlock", success: true };
  }

  // Wrong PIN
  const attempts = incrementAttempts();
  const attemptsLeft = config.max_attempts - attempts;

  if (attemptsLeft <= 0 && config.wipe_on_max_attempts) {
    return { mode: "wipe", success: false, reason: "max_attempts" };
  }

  return { mode: "wrong", success: false, attemptsLeft: Math.max(0, attemptsLeft) };
}

// ─── Local Data Wipe ──────────────────────────────────────

/**
 * Complete local wipe. Clears all app data stored locally.
 * 
 * WHAT IT CLEARS:
 * ✅ localStorage (all orbit:* keys + app data)
 * ✅ sessionStorage
 * ✅ IndexedDB (orbit-keystore + all app DBs)
 * ✅ Cache API (service worker caches)
 * ✅ Encryption keys (via orbit-keystore wipeAllKeys)
 * 
 * WHAT IT CANNOT CLEAR (web limitation):
 * ❌ Browser HTTP cache
 * ❌ DNS cache
 * ❌ Browser history (URLs visited)
 * ❌ Autofill data
 * ❌ Browser-level cookies (httpOnly)
 */
export async function performLocalWipe(): Promise<void> {
  console.warn("[Security] Performing local data wipe...");

  // 1. Wipe encryption keys from IndexedDB
  try { await wipeAllKeys(); } catch { /* continue */ }

  // 2. Clear all IndexedDB databases
  try {
    const databases = await indexedDB.databases();
    for (const db of databases) {
      if (db.name) {
        try { indexedDB.deleteDatabase(db.name); } catch { /* continue */ }
      }
    }
  } catch {
    // Firefox doesn't support indexedDB.databases()
    try { indexedDB.deleteDatabase("orbit-keystore"); } catch { /* continue */ }
    try { indexedDB.deleteDatabase("orbit-offline"); } catch { /* continue */ }
  }

  // 3. Clear Cache API
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
  } catch { /* continue */ }

  // 4. Unregister service workers
  try {
    const registrations = await navigator.serviceWorker?.getRegistrations();
    if (registrations) {
      await Promise.all(registrations.map(r => r.unregister()));
    }
  } catch { /* continue */ }

  // 5. Clear localStorage (ALL keys)
  try { localStorage.clear(); } catch { /* continue */ }

  // 6. Clear sessionStorage
  try { sessionStorage.clear(); } catch { /* continue */ }

  console.warn("[Security] Local wipe complete.");
}

// ─── Session Revocation ───────────────────────────────────

export async function revokeAllOtherSessions(): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: "others" });
  } catch (e) {
    console.error("[Security] Session revocation failed:", e);
  }
}

export async function revokeAllSessionsAndWipe(): Promise<void> {
  await performLocalWipe();
  try {
    await supabase.auth.signOut({ scope: "global" });
  } catch { /* already wiped locally */ }
}

// ─── Auto-lock on Background ─────────────────────────────

let backgroundTimer: ReturnType<typeof setTimeout> | null = null;

export function setupAutoLock(): () => void {
  const config = getSecurityConfig();
  if (!config.enabled || !config.auto_lock_on_background) return () => {};

  const handler = () => {
    if (document.hidden) {
      backgroundTimer = setTimeout(() => {
        lockApp();
      }, config.auto_lock_delay_seconds * 1000);
    } else {
      if (backgroundTimer) {
        clearTimeout(backgroundTimer);
        backgroundTimer = null;
      }
    }
  };

  document.addEventListener("visibilitychange", handler);
  return () => {
    document.removeEventListener("visibilitychange", handler);
    if (backgroundTimer) clearTimeout(backgroundTimer);
  };
}

// ─── Platform Capabilities Audit ──────────────────────────

export interface PlatformSecurityAudit {
  biometricSupported: boolean;
  screenshotBlockable: boolean;
  appSwitcherHideable: boolean;
  localWipeComplete: boolean;
  sessionRevocationSupported: boolean;
  autoLockSupported: boolean;
  notes: string[];
}

export function auditPlatformCapabilities(): PlatformSecurityAudit {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const hasWebAuthn = typeof PublicKeyCredential !== "undefined";

  return {
    biometricSupported: hasWebAuthn,
    screenshotBlockable: false, // NOT possible on web
    appSwitcherHideable: false, // NOT possible on web (blur on visibilitychange only)
    localWipeComplete: true,    // We can clear all app-level storage
    sessionRevocationSupported: true,
    autoLockSupported: true,    // Via Page Visibility API
    notes: [
      "Screenshot/screen recording CANNOT be blocked on web browsers.",
      "App switcher preview CANNOT be hidden on web (CSS blur on tab switch is a workaround).",
      hasWebAuthn ? "WebAuthn biometric supported on this browser." : "WebAuthn NOT available — PIN only.",
      isIOS && isSafari ? "iOS Safari: limited IndexedDB persistence in private browsing." : "",
      isAndroid ? "Android Chrome: full web storage access." : "",
      "Local wipe clears: localStorage, sessionStorage, IndexedDB, CacheAPI, SW registrations.",
      "Local wipe does NOT clear: browser HTTP cache, history, autofill, cookies.",
    ].filter(Boolean),
  };
}
