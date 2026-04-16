import { checkServerRateLimit, checkTierAwareRateLimit, getTierMultiplier, rateLimitResponse, rateLimitHeaders, getEndpointLimit, getClientIp, type RateLimitResult } from "./server-rate-limiter.ts";
import { createEdgeLogger } from "./structured-logger.ts";
import { corsHeaders } from "./cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface WithRateLimitOptions {
  maxRequests?: number;
  windowSeconds?: number;
  skipAuth?: boolean;
  tierAware?: boolean;
}

async function resolveUserTier(req: Request): Promise<{ userId: string | null; tier: string | null }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { userId: null, tier: null };
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) return { userId: null, tier: null };
    const sb = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return { userId: null, tier: null };
    const svc = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data } = await svc.from("profiles").select("subscription_tier").eq("id", user.id).single();
    return { userId: user.id, tier: data?.subscription_tier ?? "free" };
  } catch {
    return { userId: null, tier: null };
  }
}

export function withRateLimit(
  functionName: string,
  handler: (req: Request) => Promise<Response>,
  options?: WithRateLimitOptions,
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    const logger = createEdgeLogger(functionName);
    const startTime = Date.now();

    logger.info("request_started", {
      method: req.method,
      url: req.url,
      clientIp: getClientIp(req),
    });

    try {
      let rateLimitResult: RateLimitResult;
      let effectiveMax: number;

      if (options?.tierAware) {
        const { userId, tier } = await resolveUserTier(req);
        if (userId) {
          rateLimitResult = await checkTierAwareRateLimit(req, functionName, userId, tier, {
            maxRequests: options?.maxRequests,
            windowSeconds: options?.windowSeconds,
          });
          const multiplier = getTierMultiplier(tier);
          const limits = getEndpointLimit(functionName);
          effectiveMax = Math.ceil((options?.maxRequests ?? limits.maxRequests) * multiplier);
        } else {
          rateLimitResult = await checkServerRateLimit(req, functionName, {
            maxRequests: options?.maxRequests,
            windowSeconds: options?.windowSeconds,
          });
          const limits = getEndpointLimit(functionName);
          effectiveMax = options?.maxRequests ?? limits.maxRequests;
        }
      } else {
        rateLimitResult = await checkServerRateLimit(req, functionName, {
          maxRequests: options?.maxRequests,
          windowSeconds: options?.windowSeconds,
        });
        const limits = getEndpointLimit(functionName);
        effectiveMax = options?.maxRequests ?? limits.maxRequests;
      }

      if (!rateLimitResult.allowed) {
        logger.warn("rate_limited", {
          clientIp: getClientIp(req),
          currentCount: rateLimitResult.currentCount,
          retryAfter: rateLimitResult.retryAfterSeconds,
        });
        return rateLimitResponse(rateLimitResult);
      }

      const response = await handler(req);

      const rlHeaders = rateLimitHeaders(rateLimitResult, effectiveMax);
      const finalHeaders = new Headers(response.headers);
      for (const [k, v] of Object.entries(rlHeaders)) {
        finalHeaders.set(k, v);
      }

      logger.info("request_completed", {
        statusCode: response.status,
        durationMs: Date.now() - startTime,
        rateLimitRemaining: rateLimitResult.remaining,
      });

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: finalHeaders,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("request_failed", {
        error: err,
        durationMs: Date.now() - startTime,
      });

      return new Response(
        JSON.stringify({ error: "Internal Server Error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }
  };
}

export function withObservability(
  functionName: string,
  handler: (req: Request) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    const logger = createEdgeLogger(functionName);
    const startTime = Date.now();

    logger.info("request_started", {
      method: req.method,
      url: req.url,
    });

    try {
      const response = await handler(req);

      logger.info("request_completed", {
        statusCode: response.status,
        durationMs: Date.now() - startTime,
      });

      return response;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("request_failed", {
        error: err,
        durationMs: Date.now() - startTime,
      });
      throw error;
    }
  };
}
