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
import { corsHeaders } from "./cors.ts";
import { createEdgeLogger } from "./structured-logger.ts";

export type RouteHandler = (req: Request, params: Record<string, string>) => Promise<Response>;

interface RouteEntry {
  method: string;
  pattern: RegExp;
  handler: RouteHandler;
  paramNames: string[];
}

export class EdgeRouter {
  private routes: RouteEntry[] = [];
  private functionName: string;

  constructor(functionName: string) {
    this.functionName = functionName;
  }

  private addRoute(method: string, path: string, handler: RouteHandler): void {
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
    });
  }

  get(path: string, handler: RouteHandler): void {
    this.addRoute("GET", path, handler);
  }

  post(path: string, handler: RouteHandler): void {
    this.addRoute("POST", path, handler);
  }

  put(path: string, handler: RouteHandler): void {
    this.addRoute("PUT", path, handler);
  }

  delete(path: string, handler: RouteHandler): void {
    this.addRoute("DELETE", path, handler);
  }

  serve(): (req: Request) => Promise<Response> {
    return async (req: Request): Promise<Response> => {
      if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
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

        logger.info("route_matched", { method: req.method, path: pathname });

        try {
          const response = await route.handler(req, params);
          logger.info("route_completed", { statusCode: response.status });
          return response;
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          logger.error("route_error", { error: err, path: pathname });
          return new Response(
            JSON.stringify({ error: "Internal Server Error" }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
          );
        }
      }

      logger.warn("route_not_found", { method: req.method, path: pathname });
      return new Response(
        JSON.stringify({ error: "Not Found", path: pathname }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    };
  }
}

export function createConsolidatedHandler(functionName: string): EdgeRouter {
  return new EdgeRouter(functionName);
}
