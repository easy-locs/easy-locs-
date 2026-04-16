export type ArcjetDecision = "allow" | "deny" | "challenge";
export type ArcjetRuleType = "bot" | "rate_limit" | "shield" | "email";

export interface ArcjetConfig {
  key?: string;
  rules: ArcjetRule[];
}

export interface ArcjetRule {
  type: ArcjetRuleType;
  mode: "live" | "dry_run";
  options?: Record<string, unknown>;
}

export interface ArcjetResult {
  decision: ArcjetDecision;
  reason: string;
  ruleResults: Array<{
    rule: ArcjetRuleType;
    decision: ArcjetDecision;
    reason: string;
  }>;
  ip: string;
  ttl?: number;
}

function getArcjetKey(): string | null {
  return Deno.env.get("ARCJET_KEY") ?? null;
}

const ARCJET_API_BASE = "https://decide.arcjet.com/v1";

async function callArcjetAPI(
  endpoint: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const key = getArcjetKey();
  if (!key) throw new Error("ARCJET_KEY not configured");

  const response = await fetch(`${ARCJET_API_BASE}/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Arcjet API error [${response.status}]: ${err}`);
  }

  return response.json();
}

function extractIP(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    req.headers.get("cf-connecting-ip") ??
    "0.0.0.0"
  );
}

function extractFingerprint(req: Request): string {
  const ua = req.headers.get("user-agent") ?? "";
  const ip = extractIP(req);
  return `${ip}:${ua.slice(0, 50)}`;
}

const localBuckets = new Map<string, { count: number; windowStart: number }>();

function localRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  let bucket = localBuckets.get(key);

  if (!bucket || now - bucket.windowStart > windowMs) {
    bucket = { count: 0, windowStart: now };
    localBuckets.set(key, bucket);
  }

  bucket.count++;

  if (bucket.count > limit) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: limit - bucket.count };
}

const suspiciousPatterns = [
  /(?:select|union|insert|update|delete|drop)\s/i,
  /<script[^>]*>/i,
  /javascript\s*:/i,
  /\.\.\//g,
  /etc\/passwd/i,
  /\x00/,
];

function detectBotSignals(req: Request): { isBot: boolean; reason: string } {
  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || ua.length < 10) return { isBot: true, reason: "missing_ua" };

  const botPatterns = [
    /bot/i, /crawl/i, /spider/i, /scraper/i,
    /headless/i, /phantom/i, /selenium/i, /puppeteer/i,
  ];
  for (const pattern of botPatterns) {
    if (pattern.test(ua)) return { isBot: true, reason: "bot_ua" };
  }

  return { isBot: false, reason: "" };
}

function detectSuspiciousPayload(body: string): { isSuspicious: boolean; reason: string } {
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(body)) {
      return { isSuspicious: true, reason: "suspicious_payload" };
    }
  }
  return { isSuspicious: false, reason: "" };
}

export function validateEmail(email: string): {
  valid: boolean;
  reason: string;
  disposable: boolean;
} {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, reason: "invalid_format", disposable: false };
  }

  const disposableDomains = new Set([
    "mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email",
    "yopmail.com", "10minutemail.com", "trashmail.com", "fakeinbox.com",
    "sharklasers.com", "grr.la", "guerrillamailblock.com",
  ]);

  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  const isDisposable = disposableDomains.has(domain);

  return {
    valid: true,
    reason: isDisposable ? "disposable_email" : "ok",
    disposable: isDisposable,
  };
}

export async function arcjetProtect(
  req: Request,
  config: ArcjetConfig
): Promise<ArcjetResult> {
  const ip = extractIP(req);
  const fingerprint = extractFingerprint(req);
  const ruleResults: ArcjetResult["ruleResults"] = [];
  let finalDecision: ArcjetDecision = "allow";

  const hasRemoteKey = !!getArcjetKey();

  for (const rule of config.rules) {
    let ruleDecision: ArcjetDecision = "allow";
    let ruleReason = "ok";

    switch (rule.type) {
      case "bot": {
        const { isBot, reason } = detectBotSignals(req);
        if (isBot) {
          ruleDecision = rule.mode === "live" ? "deny" : "allow";
          ruleReason = reason;
        }
        break;
      }

      case "rate_limit": {
        const limit = (rule.options?.max as number) ?? 60;
        const windowMs = (rule.options?.windowMs as number) ?? 60_000;
        const key = `arcjet:rl:${rule.options?.key ?? "default"}:${fingerprint}`;
        const { allowed } = localRateLimit(key, limit, windowMs);
        if (!allowed) {
          ruleDecision = rule.mode === "live" ? "deny" : "allow";
          ruleReason = "rate_limited";
        }
        break;
      }

      case "shield": {
        try {
          const bodyText = await req.clone().text();
          const { isSuspicious, reason } = detectSuspiciousPayload(bodyText);
          if (isSuspicious) {
            ruleDecision = rule.mode === "live" ? "deny" : "allow";
            ruleReason = reason;
          }
        } catch {
          // no body to check
        }
        break;
      }

      case "email": {
        break;
      }
    }

    ruleResults.push({ rule: rule.type, decision: ruleDecision, reason: ruleReason });
    if (ruleDecision === "deny") finalDecision = "deny";
    if (ruleDecision === "challenge" && finalDecision !== "deny") finalDecision = "challenge";
  }

  return { decision: finalDecision, reason: "local_check", ruleResults, ip };
}

export function shieldMiddleware(endpointType: "public" | "auth" | "sensitive"): ArcjetConfig {
  const rules: ArcjetRule[] = [];

  if (endpointType === "public") {
    rules.push(
      { type: "bot", mode: "live" },
      { type: "rate_limit", mode: "live", options: { max: 100, windowMs: 60_000, key: "public" } }
    );
  }

  if (endpointType === "auth") {
    rules.push(
      { type: "bot", mode: "live" },
      { type: "shield", mode: "live" },
      { type: "rate_limit", mode: "live", options: { max: 20, windowMs: 60_000, key: "auth" } },
      { type: "email", mode: "live" }
    );
  }

  if (endpointType === "sensitive") {
    rules.push(
      { type: "bot", mode: "live" },
      { type: "shield", mode: "live" },
      { type: "rate_limit", mode: "live", options: { max: 10, windowMs: 60_000, key: "sensitive" } }
    );
  }

  return { rules };
}

export function arcjetDenyResponse(result: ArcjetResult): Response {
  const status = result.decision === "deny" ? 403 : 429;
  return new Response(
    JSON.stringify({
      error: result.decision === "deny" ? "Request blocked" : "Too many requests",
      reason: result.reason,
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...(result.ttl ? { "Retry-After": String(Math.ceil(result.ttl / 1000)) } : {}),
      },
    }
  );
}
