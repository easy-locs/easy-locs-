export const BLOCKED_HOSTS = [
  "localhost", "127.0.0.1", "0.0.0.0", "[::1]", "::1",
  "metadata.google.internal", "169.254.169.254",
];

export const BLOCKED_SUFFIXES = [".local", ".internal", ".localhost"];

export interface SsrfValidationResult {
  blocked: boolean;
  reason?: string;
}

export function validateUrlSsrf(targetUrl: string): SsrfValidationResult {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return { blocked: true, reason: "Invalid URL format" };
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return { blocked: true, reason: "Only http and https URLs are allowed" };
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  if (
    BLOCKED_HOSTS.includes(hostname) ||
    BLOCKED_SUFFIXES.some((s) => hostname.endsWith(s)) ||
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^169\.254\./.test(hostname) ||
    /^0\./.test(hostname) ||
    hostname.startsWith("[") ||
    /^fc[0-9a-f]{2}:/i.test(hostname) ||
    /^fd[0-9a-f]{2}:/i.test(hostname) ||
    /^fe80:/i.test(hostname)
  ) {
    return { blocked: true, reason: "URL targets a restricted address" };
  }

  return { blocked: false };
}
