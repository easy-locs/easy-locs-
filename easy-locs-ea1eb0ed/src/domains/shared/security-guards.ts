/**
 * Security Guards — Domain-level security primitives.
 * Applied at the use-case boundary (before business logic).
 */
import { createDomainLogger } from "./observability";

const log = createDomainLogger("security");

export interface SecurityContext {
  userId: string;
  orgId?: string;
  role?: string;
  deviceId?: string;
}

/** Ensure the caller is authenticated */
export function requireAuth(ctx: SecurityContext | null | undefined): asserts ctx is SecurityContext {
  if (!ctx?.userId) {
    log.error("auth_required", new Error("No authenticated user"));
    throw new Error("Authentication required");
  }
}

/** Ensure the caller belongs to the given org */
export function requireOrg(ctx: SecurityContext, orgId: string): void {
  if (ctx.orgId !== orgId) {
    log.warn("org_mismatch", { expected: orgId, actual: ctx.orgId, userId: ctx.userId });
    throw new Error("Organization access denied");
  }
}

/** Ensure the caller has one of the required roles */
export function requireRole(ctx: SecurityContext, ...roles: string[]): void {
  if (!ctx.role || !roles.includes(ctx.role)) {
    log.warn("role_denied", { required: roles, actual: ctx.role, userId: ctx.userId });
    throw new Error(`Role required: ${roles.join(" | ")}`);
  }
}

/** Rate limiter — simple in-memory per-key counter */
const rateCounts = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, maxPerMinute: number): void {
  const now = Date.now();
  const entry = rateCounts.get(key);

  if (!entry || now > entry.resetAt) {
    rateCounts.set(key, { count: 1, resetAt: now + 60_000 });
    return;
  }

  entry.count++;
  if (entry.count > maxPerMinute) {
    log.warn("rate_limited", { key, count: entry.count });
    throw new Error("Rate limit exceeded. Please try again later.");
  }
}

/** Input sanitizer — strips dangerous chars from user input */
export function sanitize(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}
