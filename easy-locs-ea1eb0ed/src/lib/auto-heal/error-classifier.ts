export type ErrorSeverity = "critical" | "medium" | "minor";
export type ErrorDomain = "crash" | "payment" | "auth" | "network" | "ui" | "data" | "taxonomy" | "wallet" | "orbit" | "rendering" | "unknown";

export interface ClassifiedError {
  severity: ErrorSeverity;
  domain: ErrorDomain;
  action: "rollback" | "fallback" | "retry" | "suggest" | "log" | "ignore";
  retryable: boolean;
  message: string;
  originalError: unknown;
  timestamp: number;
}

const CRITICAL_PATTERNS: Array<{ pattern: RegExp; domain: ErrorDomain }> = [
  { pattern: /Cannot read propert/i, domain: "crash" },
  { pattern: /is not a function/i, domain: "crash" },
  { pattern: /is not defined/i, domain: "crash" },
  { pattern: /null is not an object/i, domain: "crash" },
  { pattern: /undefined is not an object/i, domain: "crash" },
  { pattern: /Maximum call stack/i, domain: "crash" },
  { pattern: /out of memory/i, domain: "crash" },
  { pattern: /payment|stripe|charge|invoice/i, domain: "payment" },
  { pattern: /auth|token|session|login|unauthorized|403|401/i, domain: "auth" },
  { pattern: /wallet.*inconsist|balance.*mismatch|transfer.*fail/i, domain: "wallet" },
  { pattern: /cross.?vertical|contamination/i, domain: "taxonomy" },
  { pattern: /otp.*abuse|otp.*flood|rate.?limit.*otp/i, domain: "auth" },
];

const MEDIUM_PATTERNS: Array<{ pattern: RegExp; domain: ErrorDomain }> = [
  { pattern: /hydration/i, domain: "ui" },
  { pattern: /render|component|jsx/i, domain: "ui" },
  { pattern: /constraint|violates|duplicate key/i, domain: "data" },
  { pattern: /CORS|blocked|mixed content/i, domain: "network" },
  { pattern: /timeout|ETIMEDOUT/i, domain: "network" },
  { pattern: /taxonomy.*mismatch|wrong.*category|invalid.*vertical/i, domain: "taxonomy" },
  { pattern: /canonical.*conflict|canonical.*mismatch/i, domain: "taxonomy" },
  { pattern: /render.*mismatch|template.*invalid|fallback.*render/i, domain: "rendering" },
  { pattern: /media.*mismatch|image.*invalid|media.*rejected/i, domain: "data" },
  { pattern: /orbit.*fail|message.*send.*fail|thread.*corrupt/i, domain: "orbit" },
  { pattern: /wallet.*fail|topup.*fail/i, domain: "wallet" },
];

const IGNORABLE_PATTERNS: RegExp[] = [
  /ResizeObserver/i,
  /ChunkLoadError/i,
  /Importing a module script failed/i,
  /Failed to fetch dynamically imported/i,
  /Unable to preload CSS/i,
  /Loading chunk \d+ failed/i,
  /AbortError/i,
  /cancelled/i,
  /user aborted/i,
  /HTTP Client Error with status code/i,
  /Failed to fetch$/i,
  /Load failed$/i,
  /NetworkError when attempting/i,
  /net::ERR_/i,
];

export function classifyError(error: unknown): ClassifiedError {
  const message = extractMessage(error);
  const now = Date.now();

  for (const ignore of IGNORABLE_PATTERNS) {
    if (ignore.test(message)) {
      return { severity: "minor", domain: "unknown", action: "ignore", retryable: false, message, originalError: error, timestamp: now };
    }
  }

  for (const { pattern, domain } of CRITICAL_PATTERNS) {
    if (pattern.test(message)) {
      const retryable = domain === "network" || domain === "auth";
      return { severity: "critical", domain, action: retryable ? "retry" : "fallback", retryable, message, originalError: error, timestamp: now };
    }
  }

  for (const { pattern, domain } of MEDIUM_PATTERNS) {
    if (pattern.test(message)) {
      return { severity: "medium", domain, action: domain === "network" ? "retry" : "suggest", retryable: domain === "network", message, originalError: error, timestamp: now };
    }
  }

  if (/fetch|network|ERR_NETWORK|net::/i.test(message)) {
    return { severity: "medium", domain: "network", action: "retry", retryable: true, message, originalError: error, timestamp: now };
  }

  return { severity: "minor", domain: "unknown", action: "log", retryable: false, message, originalError: error, timestamp: now };
}

function extractMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try { return String(error); } catch { return "Unknown error"; }
}

export function isCritical(classified: ClassifiedError): boolean {
  return classified.severity === "critical";
}

export function shouldRetry(classified: ClassifiedError): boolean {
  return classified.retryable;
}

export function shouldIgnore(classified: ClassifiedError): boolean {
  return classified.action === "ignore";
}
