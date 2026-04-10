import { db } from "@/services/db";

export async function setDriverLiveStatus(params: {
  userId: string;
  isOnline?: boolean;
  isAvailable?: boolean;
  currentStatus?: string | null;
  currentLat?: number | null;
  currentLng?: number | null;
}) {
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (params.isOnline !== undefined) patch.is_online = params.isOnline;
  if (params.isAvailable !== undefined) patch.is_available = params.isAvailable;
  if (params.currentStatus !== undefined) patch.current_status = params.currentStatus;
  if (params.currentLat !== undefined) patch.current_lat = params.currentLat;
  if (params.currentLng !== undefined) patch.current_lng = params.currentLng;

  const { data, error } = await db
    .from("driver_profiles")
    .update(patch)
    .eq("user_id", params.userId)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getDriverLiveProfile(userId: string) {
  const { data, error } = await db
    .from("driver_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
