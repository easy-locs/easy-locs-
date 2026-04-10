import { tc } from "@/lib/i18n-canonical";

export function safeErrorMessage(fallbackKey?: string): string {
  return tc(fallbackKey || "common.error_generic") || "Something went wrong. Please try again.";
}
