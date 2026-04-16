/**
 * Edge Function Consolidation Router
 *
 * Architecture: Supabase Edge Functions run as isolated Deno workers — each
 * function is its own execution context. Direct module imports between functions
 * are not supported. Domain routers therefore dispatch to downstream functions
 * via internal HTTP fetch (`${SUPABASE_URL}/functions/v1/<fn>`). This provides:
 *
 * 1. Single entry point per domain (reduced DNS + TLS overhead for clients)
 * 2. Unified auth, Arcjet protection, caching, and analytics per domain
 * 3. Path-based routing with parameter extraction
 * 4. Structured logging across all endpoints in the domain
 *
 * When Supabase supports shared-runtime function bundles, routers can switch
 * to direct handler imports without changing the routing interface.
 */
import { getCorsHeaders } from "./cors.ts";
import { createEdgeLogger } from "./structured-logger.ts";
import { rejectQuerySecrets } from "./reject-query-secrets.ts";
import { requireAuthenticatedUser } from "./edge-auth.ts";
import { checkUserRateLimit, checkServerRateLimit, rateLimitResponse, rateLimitHeaders, getEndpointLimit, resolveUserTier, type UserTier } from "./server-rate-limiter.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

export type RouteHandler = (req: Request, params: Record<string, string>) => Promise<Response>;

interface RouteEntry {
  method: string;
  pattern: RegExp;
  handler: RouteHandler;
  paramNames: string[];
  skipAuth?: boolean;
  skipRateLimit?: boolean;
}

export interface EdgeRouterOptions {
  requireAuth?: boolean;
  tierAwareRateLimit?: boolean;
  defaultRateLimitMax?: number;
  defaultRateLimitWindow?: number;
}

export class EdgeRouter {
  private routes: RouteEntry[] = [];
  private functionName: string;
  private options: EdgeRouterOptions;

  constructor(functionName: string, options?: EdgeRouterOptions) {
    this.functionName = functionName;
    this.options = {
      requireAuth: true,
      tierAwareRateLimit: true,
      ...options,
    };
  }

  private addRoute(
    method: string,
    path: string,
    handler: RouteHandler,
    routeOptions?: { skipAuth?: boolean; skipRateLimit?: boolean },
  ): void {
    const paramNames: string[] = [];
    const pattern = path.replace(/:(\w+)/g, (_, name) => {
      paramNames.push(name);
      return "([^/]+)";
    });
    this.routes.push({
      method: method.toUpperCase(),
      pattern: new RegExp(`^${pattern}$`),
      handler,
      paramNames,
      skipAuth: routeOptions?.skipAuth,
      skipRateLimit: routeOptions?.skipRateLimit,
    });
  }

  get(path: string, handler: RouteHandler, options?: { skipAuth?: boolean; skipRateLimit?: boolean }): void {
    this.addRoute("GET", path, handler, options);
  }

  post(path: string, handler: RouteHandler, options?: { skipAuth?: boolean; skipRateLimit?: boolean }): void {
    this.addRoute("POST", path, handler, options);
  }

  put(path: string, handler: RouteHandler, options?: { skipAuth?: boolean; skipRateLimit?: boolean }): void {
    this.addRoute("PUT", path, handler, options);
  }

  delete(path: string, handler: RouteHandler, options?: { skipAuth?: boolean; skipRateLimit?: boolean }): void {
    this.addRoute("DELETE", path, handler, options);
  }

  private async resolveUserTier(userId: string): Promise<UserTier> {
    if (!this.options.tierAwareRateLimit || userId === "service_role") return "free";
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!supabaseUrl || !serviceKey) return "free";
      const sb = createClient(supabaseUrl, serviceKey);
      const { data } = await sb.from("profiles").select("subscription_tier").eq("id", userId).maybeSingle();
      return resolveUserTier(data?.subscription_tier);
    } catch {
      return "free";
    }
  }

  serve(): (req: Request) => Promise<Response> {
    return async (req: Request): Promise<Response> => {
      const cors = getCorsHeaders(req);

      if (req.method === "OPTIONS") {
        return new Response("ok", { headers: cors });
      }

      const secretCheck = rejectQuerySecrets(req, cors);
      if (secretCheck.rejected) {
        return secretCheck.response!;
      }

      const logger = createEdgeLogger(this.functionName);
      const url = new URL(req.url);
      const pathname = url.pathname.replace(/^\/[^/]+/, "") || "/";

      for (const route of this.routes) {
        if (route.method !== req.method) continue;
        const match = pathname.match(route.pattern);
        if (!match) continue;

        const params: Record<string, string> = {};
        route.paramNames.forEach((name, i) => {
          params[name] = match[i + 1] || "";
        });

        const needsAuth = this.options.requireAuth && !route.skipAuth;
        let userId = "anonymous";

        if (needsAuth) {
          const authResult = await requireAuthenticatedUser(req);
          if (!authResult.authorized) {
            return authResult.response!;
          }
          userId = authResult.userId!;
        }

        const needsRateLimit = !route.skipRateLimit;
        if (needsRateLimit) {
          const routeName = `${this.functionName}${pathname}`;
          if (userId !== "anonymous" && userId !== "service_role") {
            const tier = await this.resolveUserTier(userId);
            const rlResult = await checkUserRateLimit(userId, routeName, { tier });
            if (!rlResult.allowed) {
              return rateLimitResponse(rlResult);
            }
          } else {
            const rlResult = await checkServerRateLimit(req, routeName);
            if (!rlResult.allowed) {
              return rateLimitResponse(rlResult);
            }
          }
        }

        logger.info("route_matched", { method: req.method, path: pathname, userId: needsAuth ? userId : undefined });
        const startMs = Date.now();

        try {
          const response = await route.handler(req, params);
          logger.info("route_completed", { statusCode: response.status, durationMs: Date.now() - startMs });
          return response;
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          logger.error("route_error", { error: err, path: pathname, durationMs: Date.now() - startMs });
          return new Response(
            JSON.stringify({ error: "Internal Server Error" }),
            { status: 500, headers: { "Content-Type": "application/json", ...cors } },
          );
        }
      }

      logger.warn("route_not_found", { method: req.method, path: pathname });
      return new Response(
        JSON.stringify({ error: "Not Found", path: pathname }),
        { status: 404, headers: { "Content-Type": "application/json", ...cors } },
      );
    };
  }
}

export function createConsolidatedHandler(functionName: string, options?: EdgeRouterOptions): EdgeRouter {
  return new EdgeRouter(functionName, options);
}

const ROUTER_INTERNAL_HEADER = "X-Router-Origin";

function getRouterSecret(): string {
  const secret = Deno.env.get("EDGE_ROUTER_SECRET");
  if (!secret) {
    throw new Error("EDGE_ROUTER_SECRET environment variable is required");
  }
  return secret;
}

export function proxyToFunction(
  req: Request,
  functionName: string,
  cors: Record<string, string>,
  rawBody?: Uint8Array | null,
): Promise<Response> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const authHeader = req.headers.get("Authorization") ?? "";

  const bodyToSend = rawBody ?? req.body;

  const fetchOptions: RequestInit & { duplex?: string } = {
    method: req.method,
    headers: {
      Authorization: authHeader,
      "Content-Type": req.headers.get("Content-Type") ?? "application/json",
      "x-forwarded-for": req.headers.get("x-forwarded-for") ?? "",
      "cf-connecting-ip": req.headers.get("cf-connecting-ip") ?? "",
      [ROUTER_INTERNAL_HEADER]: getRouterSecret(),
    },
    body: bodyToSend,
  };

  if (!rawBody && req.body) {
    // @ts-ignore Deno supports duplex for streaming bodies
    fetchOptions.duplex = "half";
  }

  return fetch(`${supabaseUrl}/functions/v1/${functionName}`, fetchOptions).then((resp) => {
    const responseHeaders = new Headers(cors);
    const contentType = resp.headers.get("Content-Type");
    if (contentType) responseHeaders.set("Content-Type", contentType);
    const contentDisposition = resp.headers.get("Content-Disposition");
    if (contentDisposition) responseHeaders.set("Content-Disposition", contentDisposition);
    return new Response(resp.body, { status: resp.status, headers: responseHeaders });
  });
}

export function requireRouterOrigin(req: Request): { allowed: boolean; response?: Response } {
  const routerHeader = req.headers.get(ROUTER_INTERNAL_HEADER);
  const expected = getRouterSecret();

  if (routerHeader === expected) {
    return { allowed: true };
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`) {
    return { allowed: true };
  }

  return {
    allowed: false,
    response: new Response(
      JSON.stringify({ error: "Direct access denied. Use the domain router endpoint." }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    ),
  };
}
