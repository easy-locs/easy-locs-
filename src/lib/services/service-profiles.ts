import { supabase } from "@/integrations/supabase/client";

async function getCurrentUserId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not authenticated");
  return data.user.id;
}

export async function getOrCreateServiceProfile(params?: {
  workspaceId?: string;
  profileType?: "customer" | "driver" | "rider" | "taxi_driver" | "merchant_operator";
  displayName?: string;
  phone?: string;
}) {
  const userId = await getCurrentUserId();

  const { data: existing } = await (supabase as any)
    .from("service_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await (supabase as any)
    .from("service_profiles")
    .insert({
      user_id: userId,
      workspace_id: params?.workspaceId ?? null,
      profile_type: params?.profileType ?? "customer",
      display_name: params?.displayName ?? "User",
      phone: params?.phone ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getOrCreateDriverProfile(params?: {
  workspaceId?: string;
  serviceMode?: "delivery" | "taxi" | "courier" | "mixed";
  vehicleType?: "bike" | "scooter" | "car" | "van";
}) {
  const userId = await getCurrentUserId();

  const { data: existing } = await (supabase as any)
    .from("driver_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await (supabase as any)
    .from("driver_profiles")
    .insert({
      user_id: userId,
      workspace_id: params?.workspaceId ?? null,
      service_mode: params?.serviceMode ?? "delivery",
      vehicle_type: params?.vehicleType ?? "bike",
      current_status: "offline",
      is_online: false,
      is_available: false,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateDriverAvailability(params: {
  driverId: string;
  isOnline?: boolean;
  isAvailable?: boolean;
  currentStatus?: "offline" | "online" | "busy" | "paused";
  serviceMode?: "delivery" | "taxi" | "courier" | "mixed";
}) {
  const patch: Record<string, any> = { last_seen_at: new Date().toISOString() };
  if (typeof params.isOnline === "boolean") patch.is_online = params.isOnline;
  if (typeof params.isAvailable === "boolean") patch.is_available = params.isAvailable;
  if (params.currentStatus) patch.current_status = params.currentStatus;
  if (params.serviceMode) patch.service_mode = params.serviceMode;

  const { data, error } = await (supabase as any)
    .from("driver_profiles")
    .update(patch)
    .eq("id", params.driverId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
