/**
 * driver-onboarding.repository — DB operations for DriverOnboardingFlow.
 */
import { supabase } from "@/integrations/supabase/client";

export async function upsertRiderPresence(userId: string, vehicleType: string) {
  const { error } = await (supabase as any).from("rider_presence").upsert({
    user_id: userId,
    vehicle_type: vehicleType,
    is_online: false,
    is_available: false,
    rider_profile_id: userId,
    service_modes: [vehicleType === "car" ? "taxi" : "food_delivery", "parcel_delivery"],
  }, { onConflict: "user_id" });
  if (error) throw error;
}

export async function markOnboardingComplete(userId: string) {
  await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", userId);
}

export async function uploadDriverDoc(path: string, file: File) {
  const { error } = await supabase.storage.from("documents").upload(path, file);
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from("documents").getPublicUrl(path);
  return publicUrl;
}
