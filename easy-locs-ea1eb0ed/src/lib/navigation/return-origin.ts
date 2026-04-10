const STORAGE_KEY = "easylocs_return_origin";

export function setReturnOrigin(route: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      route,
      timestamp: Date.now(),
    }));
  } catch {}
}

export function getReturnOrigin(): string | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - data.timestamp > 10 * 60 * 1000) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    const route = data.route;
    if (typeof route !== "string" || !route.startsWith("/") || route.includes("://")) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return route;
  } catch {
    return null;
  }
}

export function clearReturnOrigin() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
}
