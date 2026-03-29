/**
 * nearby.repository — DB operations for CommNearbySection.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchUserPresenceSettings(userId: string) {
  const { data } = await supabase.from("user_presence")
    .select("visible_on_nearby, location_sharing, who_can_see")
    .eq("user_id", userId).single();
  return data as any;
}

export async function updateUserPresence(userId: string, fields: Record<string, any>) {
  await supabase.from("user_presence").update(fields as any).eq("user_id", userId);
}

export async function searchNearbyItems(lat: number, lng: number, radiusKm: number, itemType: string | null) {
  const { data, error } = await supabase.rpc("search_nearby_items", {
    _lat: lat, _lng: lng, _radius_km: radiusKm, _item_type: itemType,
  });
  if (error) throw error;
  return data || [];
}

export async function fetchNearbyUsers(excludeUserId: string) {
  const { data } = await supabase
    .from("user_presence")
    .select("user_id, display_name, avatar_url, status, professional_category, verified, lat, lng, last_seen_at")
    .eq("visible_on_nearby", true)
    .eq("location_sharing", true)
    .not("lat", "is", null)
    .not("lng", "is", null)
    .neq("user_id", excludeUserId);
  return (data as any[]) || [];
}
