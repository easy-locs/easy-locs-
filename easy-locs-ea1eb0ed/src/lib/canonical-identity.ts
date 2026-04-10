/**
 * Canonical Identity — SINGLE SOURCE OF TRUTH for all identity resolution.
 *
 * Every module that needs user/device/wallet/orbit context MUST call
 * getCanonicalIdentity(). No other function may generate parallel IDs.
 *
 * Hierarchy:
 *   1. Authenticated user (Supabase Auth)
 *   2. Guest ID (localStorage — easylocs_guest_id)
 *   3. Device fingerprint (SHA-256 of hardware signals)
 *
 * Orbit profile + wallet account are resolved FROM the canonical user/guest ID.
 */

import { supabase } from "@/integrations/supabase/client";
import { getGuestId } from "@/lib/guest-session";
import { getDeviceFingerprint } from "@/lib/orbit-keystore";

export type IdentityMode = "authenticated" | "guest";

export interface CanonicalIdentity {
  /** Always present — auth user id OR guest id */
  principalId: string;
  /** Auth user id if logged in, null otherwise */
  authUserId: string | null;
  /** Guest id if anonymous, null if authenticated */
  guestId: string | null;
  /** Stable device fingerprint (SHA-256 truncated) */
  deviceId: string;
  /** Orbit profile id — same as authUserId when authenticated */
  orbitProfileId: string | null;
  /** Wallet account id pattern: wallet_{userId.slice(0,12)} */
  walletAccountId: string | null;
  /** Current Supabase session id */
  sessionId: string | null;
  /** Whether user is authenticated or guest */
  mode: IdentityMode;
}

let _cached: CanonicalIdentity | null = null;
let _cacheTs = 0;
const CACHE_TTL = 30_000; // 30s — re-resolve after auth changes

/**
 * Get the single canonical identity for the current user/device.
 * Cached for 30s; call invalidateIdentityCache() on auth state change.
 */
export async function getCanonicalIdentity(): Promise<CanonicalIdentity> {
  const now = Date.now();
  if (_cached && now - _cacheTs < CACHE_TTL) return _cached;

  const [authResult, deviceId] = await Promise.all([
    supabase.auth.getSession(),
    getDeviceFingerprint(),
  ]);

  const session = authResult.data?.session ?? null;
  const authUserId = session?.user?.id ?? null;
  const isAuthenticated = !!authUserId;

  const guestId = isAuthenticated ? null : getGuestId();
  const principalId = authUserId ?? guestId!;

  const identity: CanonicalIdentity = {
    principalId,
    authUserId,
    guestId: isAuthenticated ? null : guestId,
    deviceId,
    orbitProfileId: authUserId, // orbit profile id === auth user id
    walletAccountId: authUserId ? `wallet_${authUserId.slice(0, 12)}` : null,
    sessionId: session?.access_token ? session.access_token.slice(-16) : null,
    mode: isAuthenticated ? "authenticated" : "guest",
  };

  _cached = identity;
  _cacheTs = now;
  return identity;
}

/** Force re-resolution on next call (call on auth state change) */
export function invalidateIdentityCache(): void {
  _cached = null;
  _cacheTs = 0;
}

/**
 * Synchronous read of last resolved identity.
 * Returns null if never resolved. Use getCanonicalIdentity() for guaranteed result.
 */
export function peekIdentity(): CanonicalIdentity | null {
  return _cached;
}
