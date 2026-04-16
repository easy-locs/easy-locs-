import { db } from "@/services/db";
import { structuredLogger } from "@/lib/observability/structured-logger";

export interface OmegaStreamOptions {
  messages: Array<{ role: string; content: string }>;
  message?: string;
  context?: Record<string, unknown>;
  locale?: string;
  task?: string;
  taskContext?: string;
  onToken: (token: string) => void;
  onDone?: (fullText: string) => void;
  onError?: (error: string) => void;
  signal?: AbortSignal;
}

async function getSupabaseStreamUrl(): Promise<{ url: string; token: string }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const { data } = await db.auth.getSession();
  const token = data?.session?.access_token || (import.meta.env.VITE_SUPABASE_ANON_KEY as string);
  return {
    url: `${supabaseUrl}/functions/v1/ai-assistant`,
    token,
  };
}

export async function streamOmegaResponse(options: OmegaStreamOptions): Promise<string> {
  const {
    messages,
    message,
    context,
    locale = "en",
    task = "chat",
    taskContext,
    onToken,
    onDone,
    onError,
    signal,
  } = options;

  let fullText = "";

  try {
    const { url, token } = await getSupabaseStreamUrl();

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messages,
        message,
        context,
        locale,
        task,
        taskContext,
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      onError?.(errorText || `HTTP ${response.status}`);
      return "";
    }

    const contentType = response.headers.get("Content-Type") || "";

    if (contentType.includes("text/event-stream") && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";

      while (true) {
        if (signal?.aborted) {
          reader.cancel();
          break;
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();

          if (trimmed.startsWith("event: ")) {
            currentEvent = trimmed.slice(7);
            continue;
          }

          if (trimmed.startsWith("data: ")) {
            const dataStr = trimmed.slice(6);

            if (currentEvent === "done" || dataStr === "[DONE]") {
              onDone?.(fullText);
              return fullText;
            }

            if (currentEvent === "error") {
              try {
                const payload = JSON.parse(dataStr);
                onError?.(payload.error || "Stream error");
              } catch {
                onError?.(dataStr);
              }
              return fullText;
            }

            if (currentEvent === "token") {
              try {
                const payload = JSON.parse(dataStr);
                if (payload.token) {
                  fullText += payload.token;
                  onToken(payload.token);
                }
              } catch {
                continue;
              }
            }

            currentEvent = "";
          }
        }
      }
    } else {
      const data = await response.json();
      if (data.reply) {
        fullText = data.reply;
        onToken(data.reply);
      }
    }

    onDone?.(fullText);
    return fullText;
  } catch (err) {
    if (signal?.aborted) return fullText;
    const errorMsg = err instanceof Error ? err.message : "Streaming failed";
    structuredLogger.error("intelligence", "omega_stream_error", errorMsg);
    onError?.(errorMsg);
    return fullText;
  }
}

export function createOmegaStreamController() {
  let abortController: AbortController | null = null;

  return {
    start(options: OmegaStreamOptions): Promise<string> {
      abortController = new AbortController();
      return streamOmegaResponse({
        ...options,
        signal: abortController.signal,
      });
    },

    cancel(): void {
      abortController?.abort();
      abortController = null;
    },

    get isActive(): boolean {
      return abortController !== null && !abortController.signal.aborted;
    },
  };
}
