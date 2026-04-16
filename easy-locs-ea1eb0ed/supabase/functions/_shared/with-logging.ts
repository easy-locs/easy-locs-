import { createEdgeLogger, extractEdgeTrace } from "./structured-logger.ts";
import { rejectQuerySecrets } from "./reject-query-secrets.ts";
import { corsHeaders } from "./cors.ts";

export type EdgeLogger = ReturnType<typeof createEdgeLogger>;

export function withEdgeLogging(
  functionName: string,
  handler: (
    req: Request,
    logger: EdgeLogger,
  ) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    if (req.method !== "OPTIONS") {
      const secretCheck = rejectQuerySecrets(req, corsHeaders);
      if (secretCheck.rejected) {
        return secretCheck.response!;
      }
    }

    const logger = createEdgeLogger(functionName, extractEdgeTrace(req));
    logger.info("request_started", {
      method: req.method,
      url: req.url,
      userAgent: req.headers.get("user-agent")?.slice(0, 100) ?? undefined,
    });

    try {
      const response = await handler(req, logger);
      logger.info("request_completed", { statusCode: response.status });
      // Propagate trace headers back so the front can correlate.
      const headers = new Headers(response.headers);
      for (const [k, v] of Object.entries(logger.responseHeaders())) {
        if (!headers.has(k)) headers.set(k, v);
      }
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("request_failed", { error: err });
      throw error;
    }
  };
}
