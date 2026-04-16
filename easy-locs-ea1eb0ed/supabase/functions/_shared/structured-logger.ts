export type EdgeLogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export interface EdgeLogEntry {
  timestamp: string;
  level: EdgeLogLevel;
  fn: string;
  correlationId: string;
  requestId: string;
  traceId?: string;
  parentSpanId?: string;
  spanId?: string;
  msg: string;
  durationMs?: number;
  statusCode?: number;
  userId?: string;
  error?: { name: string; message: string };
  meta?: Record<string, unknown>;
}

const LOG_LEVEL_PRIORITY: Record<EdgeLogLevel, number> = {
  debug: 0, info: 1, warn: 2, error: 3, fatal: 4,
};

const MIN_LEVEL: EdgeLogLevel = (Deno.env.get("LOG_LEVEL") as EdgeLogLevel) || "info";

function shouldLog(level: EdgeLogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[MIN_LEVEL];
}

function generateId(len = 8): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export interface TraceInit {
  traceId?: string;
  parentSpanId?: string;
  requestId?: string;
}

function parseTraceparent(v: string | null): { traceId: string; spanId: string } | null {
  if (!v) return null;
  const parts = v.split("-");
  if (parts.length !== 4) return null;
  const [version, traceId, spanId] = parts;
  if (version !== "00" || traceId.length !== 32 || spanId.length !== 16) return null;
  if (/[^0-9a-f]/i.test(traceId) || /[^0-9a-f]/i.test(spanId)) return null;
  return { traceId: traceId.toLowerCase(), spanId: spanId.toLowerCase() };
}

export function extractEdgeTrace(req: Request): TraceInit {
  const tp = parseTraceparent(req.headers.get("traceparent"));
  return {
    traceId: tp?.traceId || req.headers.get("x-trace-id") || undefined,
    parentSpanId: tp?.spanId || req.headers.get("x-span-id") || undefined,
    requestId: req.headers.get("x-request-id") || undefined,
  };
}

export function createEdgeLogger(functionName: string, init?: TraceInit) {
  const requestId = init?.requestId || `req_${generateId(4)}`;
  const correlationId = `cor_${generateId(6)}`;
  const traceId = init?.traceId || generateId(16);
  const spanId = generateId(8);
  const parentSpanId = init?.parentSpanId;
  const startTime = Date.now();

  function log(level: EdgeLogLevel, msg: string, extra?: Record<string, unknown>): void {
    if (!shouldLog(level)) return;

    const entry: EdgeLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      fn: functionName,
      correlationId,
      requestId,
      traceId,
      spanId,
      parentSpanId,
      msg,
      durationMs: Date.now() - startTime,
    };

    if (extra) {
      if (extra.userId) entry.userId = String(extra.userId);
      if (extra.statusCode) entry.statusCode = Number(extra.statusCode);
      if (extra.error) {
        const err = extra.error as Error;
        entry.error = { name: err.name, message: err.message };
      }
      const { userId, statusCode, error, ...rest } = extra;
      if (Object.keys(rest).length > 0) entry.meta = rest;
    }

    const json = JSON.stringify(entry);
    if (level === "error" || level === "fatal") {
      console.error(json);
    } else if (level === "warn") {
      console.warn(json);
    } else {
      console.log(json);
    }
  }

  return {
    debug: (msg: string, meta?: Record<string, unknown>) => log("debug", msg, meta),
    info: (msg: string, meta?: Record<string, unknown>) => log("info", msg, meta),
    warn: (msg: string, meta?: Record<string, unknown>) => log("warn", msg, meta),
    error: (msg: string, meta?: Record<string, unknown>) => log("error", msg, meta),
    fatal: (msg: string, meta?: Record<string, unknown>) => log("fatal", msg, meta),
    requestId,
    correlationId,
    traceId,
    spanId,
    parentSpanId,
    /** Trace headers to inject into outbound fetch calls (W3C + legacy). */
    outboundHeaders(): Record<string, string> {
      return {
        "traceparent": `00-${traceId}-${spanId}-01`,
        "x-trace-id": traceId,
        "x-span-id": spanId,
        "x-request-id": requestId,
      };
    },
    /** Response headers to return to the caller (lets the front match logs). */
    responseHeaders(): Record<string, string> {
      return {
        "x-trace-id": traceId,
        "x-request-id": requestId,
      };
    },
    elapsed: () => Date.now() - startTime,
  };
}

export type EdgeLoggerInstance = ReturnType<typeof createEdgeLogger>;

export function withRequestLogging(
  functionName: string,
  handler: (req: Request, logger: EdgeLoggerInstance) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const logger = createEdgeLogger(functionName, extractEdgeTrace(req));
    logger.info("request_started", {
      method: req.method,
      url: req.url,
      userAgent: req.headers.get("user-agent")?.slice(0, 100),
    });

    try {
      const response = await handler(req, logger);
      logger.info("request_completed", { statusCode: response.status });
      // Attach trace headers to the response so callers can grep logs.
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
      logger.error("request_failed", { error: error as Error });
      throw error;
    }
  };
}
