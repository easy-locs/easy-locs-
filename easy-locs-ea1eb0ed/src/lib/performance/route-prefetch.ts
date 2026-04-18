const prefetched = new Set<string>();
const chunkMap = new Map<string, () => Promise<unknown>>();

const PILLAR_CHUNKS: Record<string, string[]> = {
  dashboard: [
    "/dashboard", "/properties", "/leases", "/tenants", "/receipts",
    "/reminders", "/documents", "/finances", "/interventions", "/tasks",
  ],
  radar: [
    "/radar", "/explore", "/discover", "/travel", "/mobility",
    "/food", "/marketplace", "/search",
  ],
  orbit: [
    "/orbit", "/orbit/contacts", "/orbit/identity",
  ],
  wallet: [
    "/wallet", "/checkout", "/orders", "/pay", "/pos",
  ],
  me: [
    "/me", "/settings", "/favorites", "/notifications", "/install",
    "/merchant", "/driver", "/seller",
  ],
};

function getPillarForPath(path: string): string | null {
  for (const [pillar, prefixes] of Object.entries(PILLAR_CHUNKS)) {
    if (prefixes.some(p => path.startsWith(p))) return pillar;
  }
  return null;
}

function getNextProbablePillar(currentPath: string): string | null {
  const current = getPillarForPath(currentPath);
  const transitions: Record<string, string> = {
    dashboard: "wallet",
    radar: "wallet",
    orbit: "dashboard",
    wallet: "me",
    me: "dashboard",
  };
  return current ? transitions[current] ?? null : null;
}

export function registerRouteChunk(path: string, loader: () => Promise<unknown>): void {
  chunkMap.set(path, loader);
}

export function prefetchRoute(path: string): void {
  if (prefetched.has(path)) return;
  prefetched.add(path);

  const loader = chunkMap.get(path);
  if (loader) {
    loader().catch(() => {});
    return;
  }

  for (const [registeredPath, registeredLoader] of chunkMap.entries()) {
    if (path.startsWith(registeredPath) && !prefetched.has(registeredPath)) {
      prefetched.add(registeredPath);
      registeredLoader().catch(() => {});
      return;
    }
  }
}

export function prefetchPillar(pillarName: string): void {
  const prefixes = PILLAR_CHUNKS[pillarName];
  if (!prefixes) return;

  for (const [path, loader] of chunkMap.entries()) {
    if (prefixes.some(p => path.startsWith(p)) && !prefetched.has(path)) {
      prefetched.add(path);
      loader().catch(() => {});
    }
  }
}

export function setupHoverPrefetch(): void {
  if (typeof window === "undefined") return;

  // Task #1061: every listener guards on `instanceof Element` because
  // `e.target` can legitimately be a Text node, Document, or Window —
  // none of which have `closest()`. The previous unsafe HTMLElement cast
  // produced "Uncaught TypeError: target.closest is not a function" on
  // every page mount, which Sentry's wrap re-threw at @sentry_react.js
  // and surfaced as an uncaught runtime error in the console.
  const anchorFromEvent = (e: Event): HTMLAnchorElement | null => {
    const target = e.target;
    if (!(target instanceof Element)) return null;
    return target.closest("a[href]") as HTMLAnchorElement | null;
  };

  const handle = (e: Event): void => {
    const anchor = anchorFromEvent(e);
    if (!anchor) return;
    const href = anchor.getAttribute("href");
    if (!href || href.startsWith("http") || href.startsWith("mailto:")) return;
    const path = href.startsWith("#") ? href.slice(1) : href;
    prefetchRoute(path);
  };

  document.addEventListener("pointerenter", handle, { capture: true, passive: true });
  document.addEventListener("pointerdown", handle, { capture: true, passive: true });
  document.addEventListener("touchstart", handle, { capture: true, passive: true });
}

export function setupPredictivePrefetch(): void {
  if (typeof window === "undefined") return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLAnchorElement;
        const href = el.getAttribute("href");
        if (href) {
          const path = href.startsWith("#") ? href.slice(1) : href;
          prefetchRoute(path);
        }
      }
    },
    { rootMargin: "200px" }
  );

  const links = document.querySelectorAll("a[href^='/'], a[href^='#/']");
  links.forEach(link => observer.observe(link));

  const currentPath = window.location.pathname || "/";
  const nextPillar = getNextProbablePillar(currentPath);
  if (nextPillar) {
    requestIdleCallback(() => prefetchPillar(nextPillar), { timeout: 5000 });
  }
}

export function prefetchBottomNavPillars(): void {
  const pillars = ["dashboard", "radar", "orbit", "wallet", "me"];
  for (const pillar of pillars) {
    prefetchPillar(pillar);
  }
}

export function initRoutePrefetch(): void {
  setupHoverPrefetch();
  prefetchBottomNavPillars();
  requestIdleCallback(() => setupPredictivePrefetch(), { timeout: 3000 });
}
