import { createEdgeLogger } from "./structured-logger.ts";
import { getCorsHeaders } from "./cors.ts";
import { requireAuthenticatedUser } from "./edge-auth.ts";
import { checkServerRateLimit, checkUserRateLimit, rateLimitResponse, resolveUserTier, type UserTier } from "./server-rate-limiter.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

export type RouteMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RouteContext {
  req: Request;
  params: Record<string, string>;
  query: URLSearchParams;
  body: unknown;
  rawBody: Uint8Array | null;
  userId: string;
  logger: ReturnType<typeof createEdgeLogger>;
  corsHeaders: Record<string, string>;
}

export type RouteHandler = (ctx: RouteContext) => Promise<Response>;

interface RouteDefinition {
  method: RouteMethod;
  pattern: string;
  handler: RouteHandler;
  requireAuth?: boolean;
  rateLimit?: boolean;
}

interface RouterOptions {
  domain: string;
  basePath?: string;
  routes: RouteDefinition[];
  defaultRateLimit?: boolean;
  defaultRequireAuth?: boolean;
}

function matchRoute(
  pathname: string,
  pattern: string,
  basePath: string
): Record<string, string> | null {
  const fullPattern = `${basePath}${pattern}`;
  const patternParts = fullPattern.split("/").filter(Boolean);
  const pathParts = pathname.split("/").filter(Boolean);

  if (patternParts.length !== pathParts.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(":")) {
      params[patternParts[i].slice(1)] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

async function resolveUserTierFromDb(userId: string): Promise<UserTier> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return "free";
    const sb = createClient(url, key);
    const { data } = await sb.from("profiles").select("subscription_tier").eq("id", userId).maybeSingle();
    return resolveUserTier(data?.subscription_tier);
  } catch {
    return "free";
  }
}

export function createDomainRouter(options: RouterOptions) {
  const {
    domain,
    basePath = "",
    routes,
    defaultRateLimit = true,
    defaultRequireAuth = true,
  } = options;

  return async (req: Request): Promise<Response> => {
    const logger = createEdgeLogger(`${domain}-router`);
    const cors = getCorsHeaders(req);

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    const url = new URL(req.url);
    let pathname = url.pathname;

    const fnPathMatch = pathname.match(/^\/functions\/v1\/[^/]+(\/.*)?$/);
    if (fnPathMatch) {
      pathname = fnPathMatch[1] || "/";
    }

    const domainPrefix = `/${domain}-router`;
    if (pathname.startsWith(domainPrefix)) {
      pathname = pathname.slice(domainPrefix.length) || "/";
    }

    const method = req.method as RouteMethod;

    let rawBody: Uint8Array | null = null;
    let parsedBody: unknown = undefined;
    if (method === "POST" || method === "PUT" || method === "PATCH") {
      try {
        rawBody = new Uint8Array(await req.arrayBuffer());
        parsedBody = rawBody.length > 0
          ? JSON.parse(new TextDecoder().decode(rawBody))
          : {};
      } catch {
        parsedBody = {};
      }
    }

    let matchedRoute: RouteDefinition | null = null;
    let params: Record<string, string> = {};

    for (const route of routes) {
      if (route.method !== method) continue;
      const matched = matchRoute(pathname, route.pattern, basePath);
      if (matched !== null) {
        matchedRoute = route;
        params = matched;
        break;
      }
    }

    if (!matchedRoute && method === "POST" && parsedBody) {
      const action = (parsedBody as Record<string, unknown>)?.action as string | undefined;
      if (action) {
        for (const route of routes) {
          if (route.pattern === `/${action}` && route.method === "POST") {
            matchedRoute = route;
            params = {};
            break;
          }
        }
      }
    }

    if (!matchedRoute) {
      return new Response(
        JSON.stringify({ error: "Not found", path: pathname }),
        { status: 404, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    try {
      const needsAuth = matchedRoute.requireAuth ?? defaultRequireAuth;
      let userId = "anonymous";

      if (needsAuth) {
        const authCheck = await requireAuthenticatedUser(req);
        if (!authCheck.authorized) return authCheck.response!;
        userId = authCheck.userId!;
      }

      const needsRateLimit = matchedRoute.rateLimit ?? defaultRateLimit;
      if (needsRateLimit) {
        const routeName = `${domain}-router${matchedRoute.pattern}`;
        if (needsAuth && userId !== "anonymous") {
          const tier = await resolveUserTierFromDb(userId);
          const rlResult = await checkUserRateLimit(userId, routeName, { tier });
          if (!rlResult.allowed) return rateLimitResponse(rlResult);
        } else {
          const rlResult = await checkServerRateLimit(req, routeName);
          if (!rlResult.allowed) return rateLimitResponse(rlResult);
        }
      }

      logger.info("route_matched", {
        method,
        pattern: matchedRoute.pattern,
        userId: needsAuth ? userId : undefined,
      });

      const ctx: RouteContext = {
        req,
        params,
        query: url.searchParams,
        body: parsedBody,
        rawBody,
        userId,
        logger,
        corsHeaders: cors,
      };

      const startMs = Date.now();
      const response = await matchedRoute.handler(ctx);
      const durationMs = Date.now() - startMs;

      logger.info("route_completed", {
        statusCode: response.status,
        method,
        pattern: matchedRoute.pattern,
        durationMs,
      });

      recordEdgeMetric(
        `${domain}-router`,
        matchedRoute.pattern,
        method,
        response.status,
        durationMs,
        response.headers.get("X-Cache")?.startsWith("HIT") ?? false,
        needsAuth ? userId : undefined,
      );

      return response;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("route_error", { error: err as Error, method, pattern: matchedRoute.pattern });
      return new Response(
        JSON.stringify({ error: msg }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }
  };
}

function recordEdgeMetric(
  functionName: string,
  routePattern: string,
  method: string,
  statusCode: number,
  durationMs: number,
  cacheHit: boolean,
  userId?: string,
): void {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return;

    const supabase = createClient(url, key);
    supabase
      .from("edge_function_metrics")
      .insert({
        function_name: functionName,
        route_pattern: routePattern,
        method,
        status_code: statusCode,
        duration_ms: durationMs,
        cache_hit: cacheHit,
        user_id: userId && userId !== "anonymous" ? userId : null,
      })
      .then(() => {})
      .catch(() => {});
  } catch {
    // fire-and-forget
  }
}
