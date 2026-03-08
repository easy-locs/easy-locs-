/**
 * Use published Lovable URL as base, fallback to window.location.origin at runtime.
 * This ensures links work in preview AND production.
 */
export const APP_BASE_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : "https://easy-locs.lovable.app";

export const buildAppUrl = (path: string = "/"): string => {
  if (!path) return APP_BASE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${APP_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
};
