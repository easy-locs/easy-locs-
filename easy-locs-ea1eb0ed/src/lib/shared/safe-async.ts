import { emitRuntimeError } from "@/lib/shared/runtime-error-hub";
import { appLog } from "@/lib/shared/app-runtime-log";

export async function safeAsync<T>(
  scope: string,
  code: string,
  fn: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error: any) {
    const message = error?.message || "Unknown error";
    appLog("error", scope, message, { code });
    emitRuntimeError({
      scope,
      code,
      message,
      details: { raw: String(error) },
      createdAt: new Date().toISOString(),
    });
    return fallback;
  }
}
