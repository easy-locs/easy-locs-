/**
 * useIsAdmin — Single source of truth for admin detection.
 *
 * Two checks must both succeed:
 *   1. The user's email is on the configured allowlist.
 *      - Primary source: `VITE_ADMIN_ALLOWLIST` env var (comma/space separated).
 *      - Fallback: hard-coded `DEFAULT_ADMIN_EMAIL_ALLOWLIST` so that the
 *        super-admin owner is never locked out by a missing env var.
 *   2. The server-side `has_role` RPC confirms `admin`, `owner`, or
 *      `super_admin` for the user.
 *
 * The allowlist is the hard gate so only known accounts can ever pass the
 * admin route guard, even if the database role table is misconfigured. The
 * RPC check remains the authoritative server-side guarantee.
 *
 * Result is cached per user via react-query, scoped by `user.id` so signing
 * out disables the query and signing in as a different user refetches.
 *
 * The hook also returns a structured `denialReason` so guards can render
 * an explicit error (no more silent redirects).
 */
import { useQuery } from "@tanstack/react-query";
import { useAuthSession } from "@/contexts/AuthContext";
import { hasRole } from "@/repositories/auth-utils.repository";

/**
 * Hard-coded fallback allowlist. Used only if `VITE_ADMIN_ALLOWLIST` is not
 * set (e.g. local dev with a fresh `.env`). The intent is to guarantee the
 * project owner can always reach the admin area.
 */
const DEFAULT_ADMIN_EMAIL_ALLOWLIST: readonly string[] = [
  "habboujabir@gmail.com",
];

function readEnvAllowlist(): readonly string[] {
  // import.meta.env is statically replaced by Vite at build time and typed
  // via src/vite-env.d.ts (ImportMetaEnv.VITE_ADMIN_ALLOWLIST).
  const raw = import.meta.env.VITE_ADMIN_ALLOWLIST;
  if (!raw || typeof raw !== "string") return [];
  return raw
    .split(/[,\s;]+/g)
    .map((e) => e.trim())
    .filter(Boolean);
}

function buildAllowlist(): ReadonlySet<string> {
  const fromEnv = readEnvAllowlist();
  const merged = (fromEnv.length > 0 ? fromEnv : DEFAULT_ADMIN_EMAIL_ALLOWLIST)
    .map((e) => e.trim().toLowerCase());
  return new Set(merged);
}

/**
 * Exposed for tests / diagnostics. The set is computed once at module load
 * (env vars are static after Vite build).
 */
export const ADMIN_EMAIL_ALLOWLIST: readonly string[] = Array.from(
  buildAllowlist(),
);

const NORMALISED_ALLOWLIST = new Set(ADMIN_EMAIL_ALLOWLIST);

export function isEmailAllowedForAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return NORMALISED_ALLOWLIST.has(email.trim().toLowerCase());
}

export const isAdminQueryKey = (userId: string | null | undefined) =>
  ["auth", "is-admin", userId ?? "anon"] as const;

export type AdminDenialReason =
  | "not-authenticated"
  | "email-not-allowlisted"
  | "role-missing"
  | "rpc-error";

export interface UseIsAdminResult {
  isAdmin: boolean;
  isLoading: boolean;
  isFetched: boolean;
  /** Populated when isAdmin === false and isLoading === false. */
  denialReason: AdminDenialReason | null;
  /** Echoes back the email checked, for diagnostic display. */
  email: string | null;
}

export function useIsAdmin(): UseIsAdminResult {
  const { user, loading: authLoading } = useAuthSession();
  const userId = user?.id ?? null;
  const email = user?.email ?? null;
  const emailAllowed = isEmailAllowedForAdmin(email);

  const query = useQuery({
    queryKey: isAdminQueryKey(userId),
    queryFn: async () => {
      if (!userId) return false;
      // All three calls are allowed to throw — react-query will surface the
      // failure as `query.isError` which we map to denialReason='rpc-error'.
      // Previously `super_admin` was tolerated via .catch(() => false) which
      // silently misclassified real backend/schema failures (missing enum
      // value, RLS denial, …) as `role-missing`. We now treat them as the
      // RPC failures they are.
      const [admin, owner, superAdmin] = await Promise.all([
        hasRole(userId, "admin"),
        hasRole(userId, "owner"),
        hasRole(userId, "super_admin"),
      ]);
      return !!admin || !!owner || !!superAdmin;
    },
    // Only ever query for users whose email is explicitly allowlisted; this
    // avoids leaking even the existence of an admin check for other accounts.
    enabled: !!userId && !authLoading && emailAllowed,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const isLoading =
    authLoading || (emailAllowed && !!userId && query.isLoading);
  const isAdmin = emailAllowed && !!query.data;

  let denialReason: AdminDenialReason | null = null;
  if (!isLoading && !isAdmin) {
    if (!userId) denialReason = "not-authenticated";
    else if (!emailAllowed) denialReason = "email-not-allowlisted";
    else if (query.isError) denialReason = "rpc-error";
    else denialReason = "role-missing";
  }

  return {
    isAdmin,
    isLoading,
    isFetched: !emailAllowed ? true : query.isFetched,
    denialReason,
    email,
  };
}
