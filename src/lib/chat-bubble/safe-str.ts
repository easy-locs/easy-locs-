/**
 * safeStr — Safely coerce any value to a renderable string.
 * Prevents React error #185 (rendering objects).
 */
export function safeStr(val: unknown): string {
  if (val == null) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  try { return JSON.stringify(val); } catch { return ""; }
}
