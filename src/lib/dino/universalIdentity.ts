/**
 * DINO V20 — Universal Identity Layer
 * One identity, multiple roles, instant switching.
 */
import { supabase } from "@/integrations/supabase/client";

export type UniversalRole =
  | "customer"
  | "merchant"
  | "driver"
  | "rider"
  | "landlord"
  | "service_provider"
  | "taxi_driver"
  | "merchant_operator";

export interface UniversalIdentity {
  userId: string;
  activeRole: UniversalRole;
  roles: UniversalRole[];
  displayName: string;
  avatarUrl: string | null;
  trustLevel: number;
  orbitHandle: string | null;
}

/** Resolve all roles a user holds across service_profiles, driver_profiles, and org memberships */
export async function resolveUniversalIdentity(userId: string): Promise<UniversalIdentity> {
  const [profileRes, serviceRes, driverRes, orgRes, orbitRes] = await Promise.all([
    supabase.from("user_profiles").select("full_name, avatar_url").eq("id", userId).maybeSingle(),
    supabase.from("service_profiles").select("profile_type").eq("user_id", userId),
    supabase.from("driver_profiles").select("service_mode").eq("user_id", userId),
    supabase.from("org_members").select("role, org_id").eq("user_id", userId),
    supabase.from("orbit_identity_profiles").select("public_handle").eq("user_id", userId).maybeSingle(),
  ]);

  const roles: UniversalRole[] = ["customer"]; // everyone is a customer

  // Service profile roles
  for (const sp of serviceRes.data ?? []) {
    const pt = sp.profile_type as UniversalRole | null;
    if (pt && !roles.includes(pt)) {
      roles.push(pt);
    }
  }

  // Driver roles
  if ((driverRes.data ?? []).length > 0) {
    if (!roles.includes("driver")) roles.push("driver");
  }

  // Org-based roles (landlord = property org owner)
  for (const om of orgRes.data ?? []) {
    if (om.role === "owner" && !roles.includes("landlord")) {
      roles.push("landlord");
    }
    if (om.role === "admin" && !roles.includes("merchant")) {
      roles.push("merchant");
    }
  }

  // Trust level from reputation
  const { data: rep } = await supabase
    .from("universal_reputation_scores")
    .select("overall_score")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    userId,
    activeRole: roles[0],
    roles,
    displayName: profileRes.data?.full_name ?? "User",
    avatarUrl: profileRes.data?.avatar_url ?? null,
    trustLevel: rep?.overall_score ?? 50,
    orbitHandle: orbitRes.data?.public_handle ?? null,
  };
}

/** Switch active role — pure state helper, no DB write needed */
export function switchRole(identity: UniversalIdentity, newRole: UniversalRole): UniversalIdentity {
  if (!identity.roles.includes(newRole)) {
    console.warn(`[v20] role ${newRole} not available for user ${identity.userId}`);
    return identity;
  }
  return { ...identity, activeRole: newRole };
}

/** Ensure a role exists for the user, creating the necessary profile if missing */
export async function ensureRole(userId: string, role: UniversalRole): Promise<void> {
  if (role === "customer") return; // implicit

  if (role === "driver" || role === "rider" || role === "taxi_driver") {
    const { data } = await supabase
      .from("driver_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!data) {
      await supabase.from("driver_profiles").insert({
        user_id: userId,
        service_mode: role === "taxi_driver" ? "taxi" : "delivery",
        vehicle_type: "bike",
        current_status: "offline",
        is_online: false,
        is_available: false,
      });
    }
    return;
  }

  if (role === "merchant" || role === "merchant_operator" || role === "service_provider") {
    const { data } = await supabase
      .from("service_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!data) {
      await supabase.from("service_profiles").insert({
        user_id: userId,
        profile_type: role,
        display_name: "New Pro",
      });
    }
  }
}

/** Get trust level that follows the user across all services */
export async function getUniversalTrustLevel(userId: string): Promise<number> {
  const { data } = await (supabase as any)
    .from("universal_reputation_scores")
    .select("overall_score")
    .eq("user_id", userId)
    .maybeSingle();

  return data?.overall_score ?? 50;
}
