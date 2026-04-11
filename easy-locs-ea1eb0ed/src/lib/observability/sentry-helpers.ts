import * as Sentry from "@sentry/react";

export type ObservabilityDomain =
  | "identity"
  | "contacts"
  | "orbit"
  | "wallet"
  | "taxonomy"
  | "marketplace"
  | "radar"
  | "dashboard"
  | "provider"
  | "onboarding"
  | "public_seo"
  | "support"
  | "media"
  | "canonical"
  | "delivery";

const PHONE_REGEX = /(\+?\d[\d\s\-().]{7,}\d)/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const OTP_REGEX = /\b\d{4,8}\b/g;
const TOKEN_REGEX = /(?:ey[A-Za-z0-9_-]{10,}\.){1,2}[A-Za-z0-9_-]+/g;
const CARD_REGEX = /\b(?:\d{4}[\s-]?){3}\d{4}\b/g;

export function scrubSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
  const scrubbed: Record<string, unknown> = {};
  const sensitiveKeys = new Set([
    "phone", "email", "otp", "token", "password", "secret",
    "access_token", "refresh_token", "api_key", "authorization",
    "card_number", "cvv", "pin", "ssn", "balance", "amount",
  ]);

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.has(lowerKey) || lowerKey.includes("token") || lowerKey.includes("secret") || lowerKey.includes("password")) {
      scrubbed[key] = "[REDACTED]";
      continue;
    }
    if (typeof value === "string") {
      scrubbed[key] = value
        .replace(PHONE_REGEX, "[PHONE]")
        .replace(EMAIL_REGEX, "[EMAIL]")
        .replace(TOKEN_REGEX, "[TOKEN]")
        .replace(CARD_REGEX, "[CARD]")
        .replace(OTP_REGEX, (match) => match.length >= 4 && match.length <= 8 ? "[OTP]" : match);
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      scrubbed[key] = scrubSensitiveData(value as Record<string, unknown>);
    } else {
      scrubbed[key] = value;
    }
  }
  return scrubbed;
}

export function setSafeUserContext(userId: string, extra?: { role?: string; userType?: string; country?: string }) {
  Sentry.setUser({ id: userId });
  if (extra?.role) Sentry.setTag("user.role", extra.role);
  if (extra?.userType) Sentry.setTag("user.type", extra.userType);
  if (extra?.country) Sentry.setTag("user.country", extra.country);
}

export function setDomainContext(domain: ObservabilityDomain, context: Record<string, unknown>) {
  Sentry.setTag("domain", domain);
  Sentry.setContext(`domain.${domain}`, scrubSensitiveData(context));
}

export function addDomainBreadcrumb(
  domain: ObservabilityDomain,
  action: string,
  data?: Record<string, unknown>,
  level: Sentry.SeverityLevel = "info",
) {
  Sentry.addBreadcrumb({
    category: `${domain}.${action}`,
    message: `${domain}:${action}`,
    data: data ? scrubSensitiveData(data) : undefined,
    level,
  });
}

export function captureDomainError(
  domain: ObservabilityDomain,
  action: string,
  error: unknown,
  extra?: Record<string, unknown>,
) {
  Sentry.withScope((scope) => {
    scope.setTag("domain", domain);
    scope.setTag("domain.action", `${domain}.${action}`);
    if (extra) scope.setExtras(scrubSensitiveData(extra));
    Sentry.captureException(error);
  });
}

export function captureDomainWarning(
  domain: ObservabilityDomain,
  action: string,
  message: string,
  extra?: Record<string, unknown>,
) {
  Sentry.withScope((scope) => {
    scope.setTag("domain", domain);
    scope.setTag("domain.action", `${domain}.${action}`);
    scope.setLevel("warning");
    if (extra) scope.setExtras(scrubSensitiveData(extra));
    Sentry.captureMessage(`[${domain}] ${action}: ${message}`);
  });
}

export function startDomainSpan(
  domain: ObservabilityDomain,
  action: string,
  op: string = "function",
): ReturnType<typeof Sentry.startInactiveSpan> {
  return Sentry.startInactiveSpan({
    name: `${domain}.${action}`,
    op: `${domain}.${op}`,
    attributes: { domain, action },
  });
}

export function captureRenderMismatch(
  entityId: string,
  expectedVertical: string,
  actualVertical: string,
  templateUsed: string,
  extra?: Record<string, unknown>,
) {
  Sentry.withScope((scope) => {
    scope.setTag("domain", "canonical");
    scope.setTag("anomalyType", "render_mismatch");
    scope.setTag("entity.vertical.expected", expectedVertical);
    scope.setTag("entity.vertical.actual", actualVertical);
    scope.setTag("template.used", templateUsed);
    scope.setLevel("warning");
    if (extra) scope.setExtras(scrubSensitiveData(extra));
    Sentry.captureMessage(
      `[RENDER_MISMATCH] Entity ${entityId}: expected "${expectedVertical}" rendered with "${templateUsed}" (actual: "${actualVertical}")`,
    );
  });
}

export function captureInvalidRenderPath(
  entityId: string,
  canonicalType: string,
  reason: string,
  extra?: Record<string, unknown>,
) {
  Sentry.withScope((scope) => {
    scope.setTag("domain", "canonical");
    scope.setTag("anomalyType", "invalid_render");
    scope.setTag("entity.canonicalType", canonicalType);
    scope.setLevel("warning");
    if (extra) scope.setExtras(scrubSensitiveData(extra));
    Sentry.captureMessage(
      `[INVALID_RENDER] Entity ${entityId} (${canonicalType}): ${reason}`,
    );
  });
}

export function capturePipelineFailure(
  stage: string,
  entityId: string,
  failedGates: string[],
  extra?: Record<string, unknown>,
) {
  Sentry.withScope((scope) => {
    scope.setTag("domain", "canonical");
    scope.setTag("pipeline.stage", stage);
    scope.setTag("pipeline.failedGates", failedGates.join(","));
    scope.setLevel("error");
    if (extra) scope.setExtras(scrubSensitiveData(extra));
    Sentry.captureMessage(
      `[PIPELINE_FAIL] Entity ${entityId} failed at ${stage}: gates [${failedGates.join(", ")}]`,
    );
  });
}

export function instrumentCriticalAction<T>(
  domain: ObservabilityDomain,
  action: string,
  fn: () => Promise<T>,
  meta?: Record<string, unknown>,
): Promise<T> {
  const span = startDomainSpan(domain, action, "action");
  addDomainBreadcrumb(domain, `${action}.started`, meta);

  return fn()
    .then((result) => {
      addDomainBreadcrumb(domain, `${action}.completed`, meta);
      span?.end();
      return result;
    })
    .catch((error) => {
      captureDomainError(domain, action, error, meta);
      span?.end();
      throw error;
    });
}
