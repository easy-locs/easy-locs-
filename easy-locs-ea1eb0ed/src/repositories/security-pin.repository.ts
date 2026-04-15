/**
 * security-pin.repository — Edge function calls for PIN/wallet-pin.
 */
import { db as supabase } from "@/services/db";

const RETRY_DELAY_MS = 1000;

class BusinessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessError";
  }
}

async function parseServerError(error: unknown): Promise<string | undefined> {
  try {
    const ctx = (error as Record<string, unknown>)?.context as
      | { body?: ReadableStream; json?: () => Promise<unknown>; status?: number }
      | undefined;
    if (ctx?.json) {
      const parsed = (await ctx.json()) as Record<string, unknown>;
      return typeof parsed?.error === "string" ? parsed.error : undefined;
    } else if (ctx?.body) {
      const reader = ctx.body.getReader();
      const chunks: Uint8Array[] = [];
      let done = false;
      while (!done) {
        const result = await reader.read();
        if (result.value) chunks.push(result.value);
        done = result.done;
      }
      const merged = new Uint8Array(chunks.reduce((a, c) => a + c.length, 0));
      let offset = 0;
      for (const c of chunks) { merged.set(c, offset); offset += c.length; }
      const text = new TextDecoder().decode(merged);
      const parsed = JSON.parse(text);
      return typeof parsed?.error === "string" ? parsed.error : undefined;
    }
  } catch {}
  return undefined;
}

function isTransientError(error: unknown): boolean {
  const ctx = (error as Record<string, unknown>)?.context as
    | { status?: number }
    | undefined;
  const status = ctx?.status;
  if (status && status >= 400 && status < 500) return false;
  return true;
}

async function invokeWithRetry(
  action: string,
  body: Record<string, unknown>,
  retries = 1
): Promise<Record<string, unknown>> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke("wallet-pin", {
        body: { action, ...body },
      });

      if (error) {
        const transient = isTransientError(error);
        const serverMessage = await parseServerError(error);
        if (!transient) {
          throw new BusinessError(serverMessage || error.message || "Request failed");
        }
        throw new Error(serverMessage || error.message || "Request failed");
      }

      if (data?.error) {
        throw new BusinessError(data.error);
      }

      return data;
    } catch (e) {
      if (e instanceof BusinessError) throw e;
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
    }
  }

  throw lastError || new Error("Request failed");
}

async function invokeRawWithRetry(
  action: string,
  body: Record<string, unknown>,
  retries = 1
): Promise<Record<string, unknown>> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke("wallet-pin", {
        body: { action, ...body },
      });

      if (error) {
        const transient = isTransientError(error);
        const serverMessage = await parseServerError(error);
        if (!transient) {
          throw new BusinessError(serverMessage || error.message || "Request failed");
        }
        throw new Error(serverMessage || error.message || "Request failed");
      }

      return data;
    } catch (e) {
      if (e instanceof BusinessError) throw e;
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
    }
  }

  throw lastError || new Error("Request failed");
}

export async function checkPinStatus() {
  return await invokeRawWithRetry("check_status", {});
}

export async function setPin(pin: string) {
  return await invokeWithRetry("set_pin", { pin });
}

export async function changePin(currentPin: string, newPin: string) {
  return await invokeWithRetry("change_pin", { current_pin: currentPin, pin: newPin });
}

export async function verifyPin(pin: string) {
  return await invokeRawWithRetry("verify_pin", { pin });
}

export async function requestPinReset() {
  return await invokeWithRetry("request_reset", {}, 0);
}

export async function resetPinWithToken(token: string, newPin: string) {
  return await invokeWithRetry("reset_pin", { token, pin: newPin });
}

export async function updateDailyLimit(limit: number) {
  return await invokeWithRetry("update_daily_limit", { limit });
}
