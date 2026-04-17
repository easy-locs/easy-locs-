/**
 * useIsAdmin — Single source of truth for admin detection.
 *
 * Two checks must both succeed:
 *   1. The user's email is on the explicit allowlist (`ADMIN_EMAIL_ALLOWLIST`).
 *   2. The server-side `has_role` RPC confirms `admin` or `owner`.
 *
 * The email allowlist is the hard gate requested by the project owner so that
 * only known accounts can ever see the admin UI / pass the admin route guard,
 * even if the database role table is misconfigured. The RPC check remains the
 * authoritative server-side guarantee.
 *
 * Result is cached per user via react-query, scoped by `user.id` so signing
 * out disables the query and signing in as a different user refetches.
 */
import { useQuery } from "@tanstack/react-query";
import { useAuthSession } from "@/contexts/AuthContext";
import { hasRole } from "@/repositories/auth-utils.repository";

/**
 * Hard allowlist of email addresses authorised to see/use the admin area.
 * Comparison is case-insensitive and trimmed.
 */
export const ADMIN_EMAIL_ALLOWLIST: readonly string[] = [
  "habboujabir@gmail.com",
];

const NORMALISED_ALLOWLIST = new Set(
  ADMIN_EMAIL_ALLOWLIST.map((e) => e.trim().toLowerCase()),
);

export function isEmailAllowedForAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return NORMALISED_ALLOWLIST.has(email.trim().toLowerCase());
}

export const isAdminQueryKey = (userId: string | null | undefined) =>
  ["auth", "is-admin", userId ?? "anon"] as const;

export interface UseIsAdminResult {
  isAdmin: boolean;
  isLoading: boolean;
  isFetched: boolean;
}

export function useIsAdmin(): UseIsAdminResult {
  const { user, loading: authLoading } = useAuthSession();
  const userId = user?.id ?? null;
  const emailAllowed = isEmailAllowedForAdmin(user?.email);

  const query = useQuery({
    queryKey: isAdminQueryKey(userId),
    queryFn: async () => {
      if (!userId) return false;
      const [admin, owner] = await Promise.all([
        hasRole(userId, "admin"),
        hasRole(userId, "owner"),
      ]);
      return !!admin || !!owner;
    },
    // Only ever query for users whose email is explicitly allowlisted; this
    // avoids leaking even the existence of an admin check for other accounts.
    enabled: !!userId && !authLoading && emailAllowed,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    isAdmin: emailAllowed && !!query.data,
    isLoading: authLoading || (emailAllowed && !!userId && query.isLoading),
    isFetched: !emailAllowed ? true : query.isFetched,
  };
}
