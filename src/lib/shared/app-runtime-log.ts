export type AppRuntimeLogLevel = "info" | "warn" | "error";

export function appLog(
  level: AppRuntimeLogLevel,
  scope: string,
  message: string,
  details?: Record<string, unknown>
) {
  const payload = { level, scope, message, details: details ?? {}, createdAt: new Date().toISOString() };

  if (level === "error") console.error("[APP]", payload);
  else if (level === "warn") console.warn("[APP]", payload);
  else if (import.meta.env.DEV) console.log("[APP]", payload);
}
