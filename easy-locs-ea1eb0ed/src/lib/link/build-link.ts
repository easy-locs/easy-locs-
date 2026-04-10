/**
 * Universal link builder — always hash-router for Lovable preview.
 */
export function buildAppLink(path: string): string {
  const origin = window.location.origin;
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${origin}/#/${cleanPath}`;
}
