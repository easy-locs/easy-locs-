/**
 * AUTH DEPENDENCY: app-domain.ts
 * Contact points: SocialLoginButtons (OAuth redirect), Login.tsx (OTP redirect),
 *   AuthCallbackPage, AuthDiagnosticPage
 * buildAppUrl is used to construct OAuth redirect URLs — must work in
 * Replit dev (proxied), Lovable preview, and production deployments.
 */

function resolveBaseUrl(): string {
  if (typeof window === "undefined") return "https://easy-locs.lovable.app";

  const origin = window.location.origin;

  if (origin.includes("replit.dev") || origin.includes("repl.co")) {
    return origin;
  }

  if (origin.includes("lovable.app") || origin.includes("lovable.dev")) {
    return origin;
  }

  if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
    return origin;
  }

  return origin;
}

export const APP_BASE_URL = resolveBaseUrl();

export const buildAppUrl = (path: string = "/"): string => {
  if (!path) return APP_BASE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  const cleanBase = APP_BASE_URL.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
};
