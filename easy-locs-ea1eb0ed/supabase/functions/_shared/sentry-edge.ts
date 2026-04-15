const SENTRY_DSN = Deno.env.get("SENTRY_DSN_EDGE") || "";
const ENVIRONMENT = Deno.env.get("ENVIRONMENT") || "production";
const RELEASE = Deno.env.get("RELEASE_VERSION") || "unknown";

interface SentryEvent {
  event_id: string;
  timestamp: number;
  level: "fatal" | "error" | "warning" | "info" | "debug";
  platform: string;
  environment: string;
  release: string;
  server_name: string;
  transaction?: string;
  message?: { formatted: string };
  exception?: {
    values: Array<{
      type: string;
      value: string;
      stacktrace?: { frames: Array<{ filename: string; function: string; lineno?: number }> };
    }>;
  };
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  request?: {
    url: string;
    method: string;
    headers?: Record<string, string>;
  };
}

function generateEventId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function parseDSN(dsn: string): { publicKey: string; host: string; projectId: string } | null {
  try {
    const url = new URL(dsn);
    const publicKey = url.username;
    const host = url.hostname;
    const projectId = url.pathname.replace("/", "");
    return { publicKey, host, projectId };
  } catch {
    return null;
  }
}

export async function captureException(
  error: Error,
  context?: {
    functionName?: string;
    userId?: string;
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    request?: Request;
  },
): Promise<void> {
  const parsed = parseDSN(SENTRY_DSN);
  if (!parsed) return;

  const event: SentryEvent = {
    event_id: generateEventId(),
    timestamp: Date.now() / 1000,
    level: "error",
    platform: "node",
    environment: ENVIRONMENT,
    release: RELEASE,
    server_name: "supabase-edge",
    transaction: context?.functionName,
    exception: {
      values: [{
        type: error.name,
        value: error.message,
        stacktrace: error.stack ? {
          frames: error.stack.split("\n").slice(1, 10).map((line) => ({
            filename: line.trim(),
            function: line.trim().split("at ")[1]?.split(" ")[0] || "anonymous",
          })),
        } : undefined,
      }],
    },
    tags: {
      ...context?.tags,
      function_name: context?.functionName || "unknown",
    },
    extra: context?.extra,
  };

  if (context?.userId) {
    event.tags = { ...event.tags, user_id: context.userId };
  }

  if (context?.request) {
    event.request = {
      url: context.request.url,
      method: context.request.method,
      headers: {
        "content-type": context.request.headers.get("content-type") || "",
        "user-agent": context.request.headers.get("user-agent") || "",
      },
    };
  }

  try {
    const storeUrl = `https://${parsed.host}/api/${parsed.projectId}/store/`;
    await fetch(storeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${parsed.publicKey}, sentry_client=easy-locs-edge/1.0`,
      },
      body: JSON.stringify(event),
    });
  } catch {
    console.error("[Sentry Edge] Failed to send event");
  }
}

export async function captureMessage(
  message: string,
  level: "fatal" | "error" | "warning" | "info" = "info",
  tags?: Record<string, string>,
): Promise<void> {
  const parsed = parseDSN(SENTRY_DSN);
  if (!parsed) return;

  const event: SentryEvent = {
    event_id: generateEventId(),
    timestamp: Date.now() / 1000,
    level,
    platform: "node",
    environment: ENVIRONMENT,
    release: RELEASE,
    server_name: "supabase-edge",
    message: { formatted: message },
    tags,
  };

  try {
    const storeUrl = `https://${parsed.host}/api/${parsed.projectId}/store/`;
    await fetch(storeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${parsed.publicKey}, sentry_client=easy-locs-edge/1.0`,
      },
      body: JSON.stringify(event),
    });
  } catch {
    console.error("[Sentry Edge] Failed to send message");
  }
}

export function wrapEdgeFunction(
  functionName: string,
  handler: (req: Request) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (error) {
      await captureException(error as Error, {
        functionName,
        request: req,
      });
      throw error;
    }
  };
}
