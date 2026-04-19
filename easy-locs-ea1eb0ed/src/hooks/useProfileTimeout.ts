import { useEffect, useState } from "react";

/**
 * Single source of truth for the "profile hydration escape hatch" used by
 * every authenticated route guard (`HomeRouter`, `MarketplaceHomeRouter`,
 * `ProtectedRoute`).
 *
 * Returns `true` when the profile has finished loading OR when the timeout
 * has elapsed, so a stalled `profileLoaded` flag cannot trap a verified
 * user on a permanent skeleton (task #1058 / #1049).
 *
 * Default timeout matches the AuthContext safety timeout (2 s) so the
 * route guard and the auth hydration cap are always in sync.
 *
 * Resets on `userId` change so a fresh login restarts the timer.
 */
export function useProfileTimeout(
  profileLoaded: boolean,
  userId: string | undefined,
  ms = 2000,
): boolean {
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    setTimedOut(false);
  }, [userId]);
  useEffect(() => {
    if (profileLoaded) return;
    const t = setTimeout(() => setTimedOut(true), ms);
    return () => clearTimeout(t);
  }, [profileLoaded, ms]);
  return profileLoaded || timedOut;
}
