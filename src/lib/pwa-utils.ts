/**
 * PWA Advanced Utilities
 * - Network status detection & hook
 * - Background sync registration
 * - Service worker update management
 * - Install prompt handling
 */

import { useState, useEffect, useCallback, useRef } from "react";

// ── Network Status ───────────────────────────────────────────────────

export interface NetworkStatus {
  online: boolean;
  effectiveType?: string; // "4g" | "3g" | "2g" | "slow-2g"
  downlink?: number;      // Mbps
  rtt?: number;           // ms
  saveData?: boolean;
}

function getNetworkStatus(): NetworkStatus {
  if (typeof navigator === "undefined") return { online: true };

  const conn = (navigator as any).connection;
  return {
    online: navigator.onLine,
    effectiveType: conn?.effectiveType,
    downlink: conn?.downlink,
    rtt: conn?.rtt,
    saveData: conn?.saveData,
  };
}

/**
 * Hook: reactive network status with online/offline events.
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(getNetworkStatus);

  useEffect(() => {
    const update = () => setStatus(getNetworkStatus());

    window.addEventListener("online", update);
    window.addEventListener("offline", update);

    const conn = (navigator as any).connection;
    conn?.addEventListener?.("change", update);

    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      conn?.removeEventListener?.("change", update);
    };
  }, []);

  return status;
}

// ── Background Sync ──────────────────────────────────────────────────

/**
 * Register a one-shot background sync tag.
 * When the device comes back online, the SW will fire a "sync" event.
 */
export async function registerBackgroundSync(tag: string): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg && "sync" in reg) {
      await (reg as any).sync.register(tag);
      return true;
    }
  } catch {
    // Background sync not supported
  }
  return false;
}

/**
 * Register a periodic background sync (Chrome only, requires permission).
 */
export async function registerPeriodicSync(
  tag: string,
  minIntervalMs: number = 12 * 60 * 60 * 1000 // 12 hours
): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg && "periodicSync" in reg) {
      const status = await navigator.permissions.query({ name: "periodic-background-sync" as any });
      if (status.state === "granted") {
        await (reg as any).periodicSync.register(tag, { minInterval: minIntervalMs });
        return true;
      }
    }
  } catch {
    // Periodic sync not supported
  }
  return false;
}

// ── Service Worker Update ────────────────────────────────────────────

export interface SWUpdateState {
  updateAvailable: boolean;
  applyUpdate: () => void;
}

/**
 * Hook: detect and manage service worker updates.
 * Shows an update prompt when a new version is available.
 */
export function useSWUpdate(): SWUpdateState {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const waitingRef = useRef<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const checkUpdate = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) return;

        // If there's already a waiting worker
        if (reg.waiting) {
          waitingRef.current = reg.waiting;
          setUpdateAvailable(true);
        }

        // Listen for new updates
        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          if (!installing) return;

          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              waitingRef.current = installing;
              setUpdateAvailable(true);
            }
          });
        });
      } catch {
        // SW not available
      }
    };

    checkUpdate();

    // Listen for controller change (after skipWaiting)
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  }, []);

  const applyUpdate = useCallback(() => {
    if (waitingRef.current) {
      waitingRef.current.postMessage({ type: "SKIP_WAITING" });
    }
  }, []);

  return { updateAvailable, applyUpdate };
}

// ── Install Prompt ───────────────────────────────────────────────────

export interface InstallPromptState {
  canInstall: boolean;
  isInstalled: boolean;
  promptInstall: () => Promise<boolean>;
}

/**
 * Hook: manage PWA install prompt (A2HS).
 */
export function useInstallPrompt(): InstallPromptState {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const deferredPromptRef = useRef<any>(null);

  useEffect(() => {
    // Check if already installed
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    if (isStandalone) return;

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setCanInstall(false);
      deferredPromptRef.current = null;
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPromptRef.current) return false;
    deferredPromptRef.current.prompt();
    const { outcome } = await deferredPromptRef.current.userChoice;
    deferredPromptRef.current = null;
    setCanInstall(false);
    return outcome === "accepted";
  }, []);

  return { canInstall, isInstalled, promptInstall };
}

// ── Cache Management ─────────────────────────────────────────────────

/**
 * Get approximate cache storage usage.
 */
export async function getCacheUsage(): Promise<{ used: number; quota: number; percent: number } | null> {
  try {
    if ("storage" in navigator && "estimate" in navigator.storage) {
      const { usage, quota } = await navigator.storage.estimate();
      return {
        used: usage || 0,
        quota: quota || 0,
        percent: quota ? Math.round(((usage || 0) / quota) * 100) : 0,
      };
    }
  } catch {
    // Not supported
  }
  return null;
}

/**
 * Clear all service worker caches.
 */
export async function clearAllCaches(): Promise<number> {
  if (!("caches" in window)) return 0;
  const names = await caches.keys();
  await Promise.all(names.map(n => caches.delete(n)));
  return names.length;
}

/**
 * Request persistent storage (prevents browser from evicting data).
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) {
      return await navigator.storage.persist();
    }
  } catch {
    // Not supported
  }
  return false;
}
