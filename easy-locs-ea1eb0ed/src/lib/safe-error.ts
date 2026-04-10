import { tc } from "@/lib/i18n-canonical";

export function safeErrorMessage(fallbackKey?: string): string {
  return tc(fallbackKey || "common.error_generic") || "Something went wrong. Please try again.";
}

export function extractErrorMessage(err: unknown, fallback?: string): string {
  if (!err) return fallback || "An unexpected error occurred";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null) {
    const obj = err as Record<string, unknown>;
    if (typeof obj.message === "string" && obj.message) return obj.message;
    if (typeof obj.error === "string" && obj.error) return obj.error;
    if (typeof obj.error_description === "string") return obj.error_description;
    if (typeof obj.statusText === "string" && obj.statusText) return obj.statusText;
    if (typeof obj.code === "string") return `Error: ${obj.code}`;
  }
  return fallback || "An unexpected error occurred";
}
