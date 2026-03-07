export const APP_BASE_URL = "https://www.easy-locs.com";

export const buildAppUrl = (path: string = "/"): string => {
  if (!path) return APP_BASE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${APP_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
};
