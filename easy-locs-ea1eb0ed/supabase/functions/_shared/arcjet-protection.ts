import { getClientIp } from "./server-rate-limiter.ts";

type ArcjetMode = "bot" | "shield" | "email" | "rate-limit";

interface ArcjetConfig {
  modes: ArcjetMode[];
  rateLimitMax?: number;
  rateLimitWindow?: string;
}

interface ArcjetResult {
  allowed: boolean;
  reason: string;
  ip: string;
  riskScore: number;
}

const ARCJET_BASE_URL = "https://decide.arcjet.com/v1";

function getArcjetKey(): string | null {
  return Deno.env.get("ARCJET_KEY") ?? null;
}

function isBot(req: Request): boolean {
  const ua = (req.headers.get("user-agent") ?? "").toLowerCase();
  const botPatterns = [
    "bot", "crawler", "spider", "scraper", "headless",
    "phantom", "selenium", "puppeteer", "playwright",
    "wget", "curl", "httpclient", "python-requests",
  ];
  return botPatterns.some((p) => ua.includes(p));
}

function calculateRiskScore(req: Request): number {
  let score = 0;
  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || ua.length < 10) score += 30;
  if (isBot(req)) score += 40;
  if (!req.headers.get("accept-language")) score += 10;
  if (!req.headers.get("accept")) score += 10;
  const ip = getClientIp(req);
  if (ip === "unknown") score += 20;
  return Math.min(score, 100);
}

function validateEmail(email: string): { valid: boolean; reason: string } {
  if (!email || typeof email !== "string") {
    return { valid: false, reason: "empty" };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(email)) {
    return { valid: false, reason: "invalid_format" };
  }
  const disposableDomains = [
    "tempmail.com", "throwaway.email", "guerrillamail.com",
    "mailinator.com", "10minutemail.com", "trashmail.com",
    "yopmail.com", "sharklasers.com", "guerrillamailblock.com",
    "grr.la", "dispostable.com", "maildrop.cc",
  ];
  const domain = email.split("@")[1]?.toLowerCase();
  if (disposableDomains.includes(domain)) {
    return { valid: false, reason: "disposable_email" };
  }
  return { valid: true, reason: "ok" };
}

export async function arcjetProtect(
  req: Request,
  config: ArcjetConfig & { emailField?: string }
): Promise<ArcjetResult> {
  if (config.modes.includes("email") && config.emailField) {
    try {
      const clonedReq = req.clone();
      const body = await clonedReq.json();
      const email = body?.[config.emailField];
      if (email) {
        const emailResult = validateEmail(email);
        if (!emailResult.valid) {
          return { allowed: false, reason: `email_${emailResult.reason}`, ip: getClientIp(req), riskScore: 100 };
        }
      }
    } catch {
      // unable to parse body for email validation, continue with other checks
    }
  }
  const ip = getClientIp(req);
  const arcjetKey = getArcjetKey();

  if (arcjetKey) {
    try {
      const resp = await fetch(`${ARCJET_BASE_URL}/decide`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${arcjetKey}`,
        },
        body: JSON.stringify({
          ip,
          user_agent: req.headers.get("user-agent") ?? "",
          url: req.url,
          method: req.method,
          modes: config.modes,
          rate_limit: config.rateLimitMax
            ? { max: config.rateLimitMax, window: config.rateLimitWindow ?? "60s" }
            : undefined,
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        return {
          allowed: data.conclusion === "ALLOW",
          reason: data.reason ?? "arcjet_decision",
          ip,
          riskScore: data.risk_score ?? 0,
        };
      }
      console.warn("[arcjet] API returned non-OK, falling back to local checks");
    } catch (err) {
      console.warn("[arcjet] API call failed, falling back to local checks:", err);
    }
  }

  const riskScore = calculateRiskScore(req);

  if (config.modes.includes("bot") && riskScore >= 70) {
    return { allowed: false, reason: "bot_detected", ip, riskScore };
  }

  if (config.modes.includes("shield") && riskScore >= 80) {
    return { allowed: false, reason: "shield_blocked", ip, riskScore };
  }

  if (config.modes.includes("rate-limit") && config.rateLimitMax) {
    const key = `arcjet-rl:${ip}:${req.url}`;
    const windowMs = parseInt(config.rateLimitWindow ?? "60s") * 1000 || 60000;
    const now = Date.now();
    const windowId = Math.floor(now / windowMs);
    const counterKey = `${key}:${windowId}`;

    const counters = (globalThis as Record<string, Record<string, number>>).__arcjetCounters ??= {};
    counters[counterKey] = (counters[counterKey] ?? 0) + 1;

    if (counters[counterKey] > config.rateLimitMax) {
      return { allowed: false, reason: "rate_limit_exceeded", ip, riskScore };
    }

    for (const k of Object.keys(counters)) {
      if (!k.endsWith(`:${windowId}`)) delete counters[k];
    }
  }

  return { allowed: true, reason: "local_pass", ip, riskScore };
}

export function arcjetValidateEmail(email: string): { valid: boolean; reason: string } {
  return validateEmail(email);
}

export function arcjetDenyResponse(result: ArcjetResult): Response {
  return new Response(
    JSON.stringify({ error: "Access denied", reason: result.reason }),
    {
      status: 403,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}
