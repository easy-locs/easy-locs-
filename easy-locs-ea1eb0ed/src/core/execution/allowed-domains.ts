/**
 * Allowed dispatcher domains — single source of truth.
 *
 * The Agent Command Console populates its domain dropdown from this list,
 * and the validation engine rejects any dispatch whose domain is not in
 * this list. Keep this file in sync with the set of backend domain agents.
 */

export const ALLOWED_DISPATCH_DOMAINS = [
  "platform_core",
  "dashboard",
  "wallet",
  "shop",
  "food",
  "hotel",
  "real_estate",
  "delivery",
  "transport",
  "flight",
  "health",
  "media",
  "search",
  "orbit",
  "orchestrator-pr",
] as const;

export type AllowedDispatchDomain = (typeof ALLOWED_DISPATCH_DOMAINS)[number];

export function isAllowedDispatchDomain(domain: string): boolean {
  if (!domain || typeof domain !== "string") return false;
  return (ALLOWED_DISPATCH_DOMAINS as readonly string[]).includes(domain.trim());
}
