/**
 * Always use the canonical production domain for shared links.
 * Never leak dev/preview URLs into shared content.
 */
export const APP_BASE_URL = "https://www.easy-locs.com";

export const buildAppUrl = (path: string = "/"): string => {
  if (!path) return APP_BASE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  const cleanBase = APP_BASE_URL.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
};
