/**
 * Version-aware cache invalidation utility.
 * Checks for app updates and prompts safe refresh when needed.
 */

const VERSION_KEY = "easylocs-app-version";
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Build-time version stamp (Vite injects this)
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || __BUILD_TIMESTAMP__;

declare const __BUILD_TIMESTAMP__: string;

/**
 * Checks if the app version has changed since last load.
 * Returns true if an update is available.
 */
export function checkForUpdate(): boolean {
  const stored = localStorage.getItem(VERSION_KEY);
  if (!stored) {
    localStorage.setItem(VERSION_KEY, APP_VERSION);
    return false;
  }
  return stored !== APP_VERSION;
}

/**
 * Marks the current version as acknowledged.
 */
export function acknowledgeUpdate(): void {
  localStorage.setItem(VERSION_KEY, APP_VERSION);
}

/**
 * Forces a clean refresh, clearing service worker caches.
 */
export async function forceCleanRefresh(): Promise<void> {
  // Unregister all service workers
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((r) => r.unregister()));
  }

  // Clear caches
  if ("caches" in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
  }

  // Update stored version
  acknowledgeUpdate();

  // Hard reload with explicit cache-busting marker
  const url = new URL(window.location.href);
  url.searchParams.set("build", APP_VERSION);
  window.location.replace(url.toString());
}

/**
 * Starts a periodic check for new versions.
 * Calls onUpdateAvailable when a new version is detected.
 */
export function startVersionPolling(onUpdateAvailable: () => void): () => void {
  let active = true;

  const check = async () => {
    if (!active) return;
    try {
      // Fetch the HTML to check for new asset hashes
      const res = await fetch("/?_v=" + Date.now(), {
        cache: "no-store",
        headers: { Accept: "text/html" },
      });
      if (!res.ok) return;

      const html = await res.text();
      // Extract script src hashes from the HTML
      const scriptMatches = html.match(/src="\/assets\/[^"]+"/g);
      const currentScripts = Array.from(document.querySelectorAll('script[src*="/assets/"]'))
        .map((s) => s.getAttribute("src"));

      if (scriptMatches && currentScripts.length > 0) {
        const newSrcs = scriptMatches.map((m) => m.replace('src="', "").replace('"', ""));
        const hasNewAssets = newSrcs.some((src) => !currentScripts.includes(src));
        if (hasNewAssets) {
          onUpdateAvailable();
        }
      }
    } catch {
      // Network error, skip
    }
  };

  const interval = setInterval(check, CHECK_INTERVAL);
  // First check after 30s
  const timeout = setTimeout(check, 30_000);

  return () => {
    active = false;
    clearInterval(interval);
    clearTimeout(timeout);
  };
}
