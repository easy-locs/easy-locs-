export type EdgeLogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export interface EdgeLogEntry {
  timestamp: string;
  level: EdgeLogLevel;
  fn: string;
  correlationId: string;
  requestId: string;
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

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEdgeLogger(functionName: string) {
  const requestId = `req_${generateId()}`;
  const correlationId = `cor_${generateId()}`;
  const startTime = Date.now();

  function log(level: EdgeLogLevel, msg: string, extra?: Record<string, unknown>): void {
    if (!shouldLog(level)) return;

    const entry: EdgeLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      fn: functionName,
      correlationId,
      requestId,
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
    elapsed: () => Date.now() - startTime,
  };
}

export function withRequestLogging(
  functionName: string,
  handler: (req: Request, logger: ReturnType<typeof createEdgeLogger>) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const logger = createEdgeLogger(functionName);
    logger.info("request_started", {
      method: req.method,
      url: req.url,
      userAgent: req.headers.get("user-agent")?.slice(0, 100),
    });

    try {
      const response = await handler(req, logger);
      logger.info("request_completed", { statusCode: response.status });
      return response;
    } catch (error) {
      logger.error("request_failed", { error: error as Error });
      throw error;
    }
  };
}
