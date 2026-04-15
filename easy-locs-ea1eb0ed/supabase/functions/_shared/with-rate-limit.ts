import { checkServerRateLimit, rateLimitResponse, rateLimitHeaders, getEndpointLimit, getClientIp } from "./server-rate-limiter.ts";
import { createEdgeLogger } from "./structured-logger.ts";
import { corsHeaders } from "./cors.ts";

export interface WithRateLimitOptions {
  maxRequests?: number;
  windowSeconds?: number;
  skipAuth?: boolean;
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
      const rateLimitResult = await checkServerRateLimit(req, functionName, {
        maxRequests: options?.maxRequests,
        windowSeconds: options?.windowSeconds,
      });

      if (!rateLimitResult.allowed) {
        logger.warn("rate_limited", {
          clientIp: getClientIp(req),
          currentCount: rateLimitResult.currentCount,
          retryAfter: rateLimitResult.retryAfterSeconds,
        });
        return rateLimitResponse(rateLimitResult);
      }

      const response = await handler(req);

      const limits = getEndpointLimit(functionName);
      const rlHeaders = rateLimitHeaders(rateLimitResult, options?.maxRequests ?? limits.maxRequests);
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
