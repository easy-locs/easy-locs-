/**
 * Version-aware cache invalidation utility.
 * Checks for app updates and prompts safe refresh when needed.
 */

const VERSION_KEY = "easylocs-app-version";
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Build-time version stamp (Vite injects this)
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || __BUILD_TIMESTAMP__;

declare const __BUILD_TIMESTAMP__: string;

function normalizeAssetPath(value: string | null | undefined): string | null {
  if (!value) return null;

  try {
    const url = new URL(value, window.location.origin);
    return `${url.pathname}${url.search}`;
  } catch {
    return value;
  }
}

function extractAssetPathsFromHtml(html: string): string[] {
  return Array.from(
    new Set(Array.from(html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g), (match) => match[1])),
  );
}

function getLoadedAssetPaths(): string[] {
  return Array.from(
    new Set(
      Array.from(
        document.querySelectorAll<HTMLScriptElement | HTMLLinkElement>(
          'script[src*="/assets/"], link[href*="/assets/"]',
        ),
      )
        .map((element) => normalizeAssetPath(element.getAttribute("src") ?? element.getAttribute("href")))
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

async function fetchServedHtml(): Promise<string | null> {
  const url = new URL(window.location.href);
  url.hash = "";
  url.searchParams.set("_html", Date.now().toString());

  const res = await fetch(url.toString(), {
    cache: "no-store",
    headers: {
      Accept: "text/html",
      "Cache-Control": "no-cache, no-store, max-age=0",
      Pragma: "no-cache",
    },
  });

  if (!res.ok) return null;
  return await res.text();
}

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

export async function purgeLegacyServiceWorkersAndCaches(): Promise<number> {
  let registrationCount = 0;

  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    registrationCount = registrations.length;

    if (registrationCount > 0) {
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  }

  if ("caches" in window) {
    const cacheNames = await caches.keys();
    if (cacheNames.length > 0) {
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }
  }

  return registrationCount;
}

// enforceVersionConsistencyOnBoot removed — risky auto-reload on boot is forbidden.
// Use startVersionPolling for non-destructive update detection.

/**
 * Forces a clean refresh, clearing service worker caches.
 */
export async function forceCleanRefresh(): Promise<void> {
  await purgeLegacyServiceWorkersAndCaches();

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
      const html = await fetchServedHtml();
      if (!html) return;

      const servedAssetPaths = extractAssetPathsFromHtml(html);
      const currentAssets = getLoadedAssetPaths();

      if (servedAssetPaths.length > 0 && currentAssets.length > 0) {
        const hasNewAssets = servedAssetPaths.some((src) => !currentAssets.includes(src));
        if (hasNewAssets) {
          onUpdateAvailable();
        }
      }
    } catch {
      // Network error, skip
    }
  };

  const interval = setInterval(check, CHECK_INTERVAL);
  const timeout = setTimeout(check, 30_000);

  return () => {
    active = false;
    clearInterval(interval);
    clearTimeout(timeout);
  };
}