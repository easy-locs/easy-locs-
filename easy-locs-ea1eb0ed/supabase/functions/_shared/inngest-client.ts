const INNGEST_EVENT_URL = () => Deno.env.get("INNGEST_EVENT_KEY")
  ? `https://inn.gs/e/${Deno.env.get("INNGEST_EVENT_KEY")}`
  : null;

const INNGEST_SIGNING_KEY = () => Deno.env.get("INNGEST_SIGNING_KEY") ?? "";

interface InngestEvent {
  name: string;
  data: Record<string, unknown>;
  user?: Record<string, unknown>;
  ts?: number;
}

interface InngestStepContext {
  stepId: string;
  attempt: number;
}

interface InngestFunctionConfig {
  id: string;
  name: string;
  triggers: Array<{ event: string } | { cron: string }>;
  retries?: number;
  concurrency?: number;
  handler: (event: InngestEvent, step: InngestStepRunner) => Promise<unknown>;
}

interface InngestStepRunner {
  run: <T>(id: string, fn: () => Promise<T>) => Promise<T>;
  sleep: (id: string, duration: string) => Promise<void>;
  sendEvent: (id: string, event: InngestEvent) => Promise<void>;
}

export async function sendInngestEvent(event: InngestEvent): Promise<boolean> {
  const url = INNGEST_EVENT_URL();
  if (!url) {
    console.warn("[inngest] INNGEST_EVENT_KEY not configured, skipping event:", event.name);
    return false;
  }

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...event,
        ts: event.ts ?? Math.floor(Date.now() / 1000),
      }),
    });

    if (!resp.ok) {
      console.error(`[inngest] Event send failed: ${resp.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[inngest] Event send error:", err);
    return false;
  }
}

export async function sendInngestEvents(events: InngestEvent[]): Promise<boolean> {
  const url = INNGEST_EVENT_URL();
  if (!url) {
    console.warn("[inngest] INNGEST_EVENT_KEY not configured, skipping batch");
    return false;
  }

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(events.map((e) => ({
        ...e,
        ts: e.ts ?? Math.floor(Date.now() / 1000),
      }))),
    });

    return resp.ok;
  } catch (err) {
    console.error("[inngest] Batch send error:", err);
    return false;
  }
}

const registeredFunctions: Map<string, InngestFunctionConfig> = new Map();

export function createInngestFunction(config: InngestFunctionConfig): InngestFunctionConfig {
  registeredFunctions.set(config.id, config);
  return config;
}

export function getRegisteredFunctions(): InngestFunctionConfig[] {
  return Array.from(registeredFunctions.values());
}

export function createStepRunner(attempt = 0): InngestStepRunner {
  return {
    async run<T>(id: string, fn: () => Promise<T>): Promise<T> {
      try {
        return await fn();
      } catch (err) {
        console.error(`[inngest] Step "${id}" failed:`, err);
        throw err;
      }
    },

    async sleep(id: string, duration: string): Promise<void> {
      const ms = parseDuration(duration);
      console.log(`[inngest] Step "${id}" sleeping for ${duration} (${ms}ms)`);
      await new Promise((resolve) => setTimeout(resolve, Math.min(ms, 30000)));
    },

    async sendEvent(id: string, event: InngestEvent): Promise<void> {
      await sendInngestEvent(event);
    },
  };
}

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 1000;
  const value = parseInt(match[1]);
  switch (match[2]) {
    case "s": return value * 1000;
    case "m": return value * 60 * 1000;
    case "h": return value * 3600 * 1000;
    case "d": return value * 86400 * 1000;
    default: return 1000;
  }
}

export async function handleInngestRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (req.method === "GET" || url.searchParams.has("introspect")) {
    const functions = getRegisteredFunctions().map((fn) => ({
      id: fn.id,
      name: fn.name,
      triggers: fn.triggers,
      steps: { step: { id: "step", name: fn.name, runtime: { type: "http" } } },
    }));

    return new Response(JSON.stringify({
      framework: "deno",
      appName: "easy-locs",
      functions,
      url: url.origin + url.pathname,
    }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method === "POST") {
    try {
      const body = await req.json();
      const eventName = body?.event?.name;
      const functionId = body?.fn_id ?? url.searchParams.get("fnId");

      const fn = functionId
        ? registeredFunctions.get(functionId)
        : getRegisteredFunctions().find((f) =>
            f.triggers.some((t) => "event" in t && t.event === eventName)
          );

      if (!fn) {
        return new Response(JSON.stringify({ error: "No matching function" }), { status: 404 });
      }

      const step = createStepRunner(body?.attempt ?? 0);
      const result = await fn.handler(body.event ?? body, step);

      return new Response(JSON.stringify({ status: "completed", result }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[inngest] Handler error:", msg);
      return new Response(JSON.stringify({ error: msg }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405 });
}
