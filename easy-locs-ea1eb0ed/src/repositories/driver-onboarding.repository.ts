/**
 * driver-onboarding.repository — DB operations for DriverOnboardingFlow.
 */
import { db } from "@/services/db";

export async function upsertRiderPresence(userId: string, vehicleType: string) {
  const { error } = await db("rider_presence").upsert({
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
  await db("profiles").update({ onboarding_completed: true }).eq("id", userId);
}

export async function uploadDriverDoc(path: string, file: File) {
  const { error } = await db.storage.from("documents").upload(path, file);
  if (error) throw error;
  const { data: { publicUrl } } = db.storage.from("documents").getPublicUrl(path);
  return publicUrl;
}
