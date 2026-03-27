/**
 * resolveDirectPeer — Canonical single source of truth for Orbit direct contact resolution.
 * Resolves any input (email, phone, userId, orbitId, contact object) to a canonical peer.
 * Uses ONLY orbit_profiles_v2 as the identity source.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export interface ResolvedDirectPeer {
  peerUserId: string | null;
  peerOrbitId: string | null;
  displayName: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  resolvable: boolean;
  reason?: string | null;
}

export interface DirectPeerInput {
  email?: string | null;
  phone?: string | null;
  userId?: string | null;
  orbitId?: string | null;
  contact?: {
    id?: string;
    user_id?: string;
    userId?: string;
    orbit_id?: string;
    orbitId?: string;
    email?: string;
    phone?: string;
    display_name?: string;
    displayName?: string;
    name?: string;
    avatar_url?: string;
    avatarUrl?: string;
  } | null;
}

const UNRESOLVABLE: ResolvedDirectPeer = {
  peerUserId: null,
  peerOrbitId: null,
  displayName: "Unknown",
  email: null,
  phone: null,
  avatarUrl: null,
  resolvable: false,
  reason: "no_input",
};

/**
 * Resolves a direct peer from any input — email, phone, userId, orbitId, or contact object.
 * Returns a canonical ResolvedDirectPeer or unresolvable result.
 */
export async function resolveDirectPeer(input: DirectPeerInput): Promise<ResolvedDirectPeer> {
  // Flatten contact object into top-level fields
  const userId = input.userId || input.contact?.userId || input.contact?.user_id || input.contact?.id || null;
  const orbitId = input.orbitId || input.contact?.orbitId || input.contact?.orbit_id || null;
  const email = input.email || input.contact?.email || null;
  const phone = input.phone || input.contact?.phone || null;
  const fallbackName = input.contact?.displayName || input.contact?.display_name || input.contact?.name || null;
  const fallbackAvatar = input.contact?.avatarUrl || input.contact?.avatar_url || null;

  // ── 1. Resolve by userId (fastest) ──
  if (userId) {
    const profile = await fetchOrbitProfile("id", userId);
    if (profile) return profileToResolved(profile);
  }

  // ── 2. Resolve by orbitId ──
  if (orbitId) {
    const profile = await fetchOrbitProfile("orbit_id", orbitId);
    if (profile) return profileToResolved(profile);
  }

  // ── 3. Resolve by email ──
  if (email) {
    const normalized = email.trim().toLowerCase();
    const profile = await fetchOrbitProfileByEmail(normalized);
    if (profile) return profileToResolved(profile);

    // Known email but no orbit profile — partially resolvable
    return {
      peerUserId: null,
      peerOrbitId: null,
      displayName: fallbackName || normalized.split("@")[0],
      email: normalized,
      phone,
      avatarUrl: fallbackAvatar,
      resolvable: false,
      reason: "no_orbit_profile_for_email",
    };
  }

  // ── 4. Fallback with contact metadata ──
  if (fallbackName) {
    return {
      peerUserId: userId,
      peerOrbitId: orbitId,
      displayName: fallbackName,
      email: null,
      phone,
      avatarUrl: fallbackAvatar,
      resolvable: false,
      reason: "fallback_contact_only",
    };
  }

  return { ...UNRESOLVABLE };
}

// ── Internal helpers ──

async function fetchOrbitProfile(field: string, value: string) {
  const { data, error } = await db
    .from("orbit_profiles_v2")
    .select("id, orbit_id, display_name, email, avatar_url")
    .eq(field, value)
    .maybeSingle();

  if (error) {
    console.error("[resolveDirectPeer] lookup error:", error);
    return null;
  }
  return data;
}

async function fetchOrbitProfileByEmail(email: string) {
  const { data, error } = await db
    .from("orbit_profiles_v2")
    .select("id, orbit_id, display_name, email, avatar_url")
    .ilike("email", email)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[resolveDirectPeer] email lookup error:", error);
    return null;
  }
  return data;
}

function profileToResolved(profile: any): ResolvedDirectPeer {
  return {
    peerUserId: profile.id,
    peerOrbitId: profile.orbit_id,
    displayName: profile.display_name || profile.email?.split("@")[0] || "User",
    email: profile.email || null,
    phone: null,
    avatarUrl: profile.avatar_url || null,
    resolvable: true,
    reason: null,
  };
}
