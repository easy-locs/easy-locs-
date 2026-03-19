/**
 * Universal link builder — hash-router aware.
 */
export function buildAppLink(path: string): string {
  const base = window.location.origin;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const isHashRouter =
    window.location.hash.startsWith("#/") || window.location.href.includes("/#/");
  return isHashRouter ? `${base}/#${normalized}` : `${base}${normalized}`;
}
