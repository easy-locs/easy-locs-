/**
 * orbit-profile.repository — Canonical DB access for orbit_profiles_v2.
 * Replaces direct supabase.from("orbit_profiles_v2") calls in orbitStore.ts.
 *
 * All reads/writes to orbit_profiles_v2 for the profile domain go through here.
 */
import { supabase } from "@/integrations/supabase/client";
import type { CanonicalOrbitProfile } from "@/domains/shared/canonical-types";
import type { AppRole } from "@/domains/shared/canonical-types";

const db = supabase as any;

/**
 * Fetch a single orbit profile by auth user ID.
 * Returns null if not found or on error.
 */
export async function getOrbitProfile(userId: string): Promise<CanonicalOrbitProfile | null> {
  const { data, error } = await db
    .from("orbit_profiles_v2")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[orbit-profile.repository] getOrbitProfile failed:", error);
    return null;
  }

  if (!data) return null;

  return mapRowToProfile(data);
}

/**
 * Update the role for a given user's orbit profile.
 * Returns true on success, false on error.
 */
export async function updateOrbitProfileRole(userId: string, role: AppRole): Promise<boolean> {
  const { error } = await db
    .from("orbit_profiles_v2")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) {
    console.error("[orbit-profile.repository] updateOrbitProfileRole failed:", error);
    return false;
  }

  return true;
}

// ── Mapper ──

function mapRowToProfile(data: any): CanonicalOrbitProfile {
  return {
    id: data.id,
    orbitId: data.orbit_id,
    email: data.email ?? null,
    role: (data.role as AppRole) || "buyer",
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    deviceId: data.device_id,
    verificationLevel: data.verification_level ?? 1,
    permissions: data.permissions ?? {
      camera: false,
      microphone: false,
      geolocation: false,
      contacts: false,
      notifications: false,
    },
    serviceLinks: data.service_links ?? {
      walletLinked: false,
      bookingEnabled: true,
      deliveryEnabled: true,
      propertyEnabled: true,
      messagingEnabled: true,
    },
  };
}
