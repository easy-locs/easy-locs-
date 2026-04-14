const DEEP_LINK_ROUTES: Record<string, string> = {
  "/p/": "/property/search/",
  "/l/": "/listing/",
  "/u/": "/user/",
  "/c/": "/orbit",
  "/pay/": "/wallet/pay/",
  "/shop/": "/shop/store/",
  "/order/": "/orders/",
  "/qr/": "/qr/resolve/",
};

export function resolveDeepLink(url: string): string | null {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;

    for (const [prefix, target] of Object.entries(DEEP_LINK_ROUTES)) {
      if (path.startsWith(prefix)) {
        const suffix = path.slice(prefix.length);
        return target + suffix + parsed.search + parsed.hash;
      }
    }

    return path + parsed.search + parsed.hash;
  } catch {
    return null;
  }
}

export async function initDeepLinkListener(navigate: (path: string) => void): Promise<() => void> {
  let capacitorCleanup: (() => void) | null = null;

  try {
    const { App } = await import("@capacitor/app" as string);
    const listener = await App.addListener("appUrlOpen", (data: { url: string }) => {
      const resolved = resolveDeepLink(data.url);
      if (resolved) navigate(resolved);
    });
    capacitorCleanup = () => listener.remove();
  } catch {
    // Not running in Capacitor — use web fallback
  }

  if (typeof window !== "undefined" && window.location.search) {
    const params = new URLSearchParams(window.location.search);
    const deepLink = params.get("deep_link");
    if (deepLink) {
      const resolved = resolveDeepLink(deepLink);
      if (resolved) {
        setTimeout(() => navigate(resolved), 100);
      }
    }
  }

  return () => {
    capacitorCleanup?.();
  };
}
