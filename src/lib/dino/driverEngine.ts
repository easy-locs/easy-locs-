/**
 * DINO — Driver Engine
 * Driver recruitment, activation, and assignment via existing driver_profiles table.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

// =============================
// TYPES
// =============================

export interface DriverLead {
  userId: string;
  city: string;
  countryCode: string;
  vehicleType?: string;
  phone?: string;
}

// =============================
// 1) IMPORT / RECRUIT DRIVERS
// =============================

export async function importDriverLeads(leads: DriverLead[]): Promise<number> {
  let imported = 0;

  for (const lead of leads) {
    const { error } = await supabase.from("driver_profiles").insert({
      user_id: lead.userId,
      city: lead.city,
      country_code: lead.countryCode,
      vehicle_type: lead.vehicleType ?? "car",
      service_mode: "delivery",
      is_available: false,
      is_online: false,
      is_verified: false,
      current_status: "invited",
    });

    if (!error) imported++;
  }

  if (imported > 0) {
    await supabase.from("dino_learning_events").insert([{
      event_type: "drivers_imported",
      entity_id: "batch",
      entity_type: "driver",
      metric: "imported_count",
      metadata_json: { total: leads.length, imported } as unknown as Json,
      new_value: imported,
      previous_value: 0,
    }]);
  }

  return imported;
}

// =============================
// 2) FIND AVAILABLE DRIVERS
// =============================

export async function findAvailableDrivers(city: string, limit = 10) {
  const { data } = await supabase
    .from("driver_profiles")
    .select("id, user_id, city, vehicle_type, rating, reliability_score, current_lat, current_lng")
    .eq("city", city)
    .eq("is_available", true)
    .eq("is_online", true)
    .order("reliability_score", { ascending: false })
    .limit(limit);

  return data ?? [];
}

// =============================
// 3) ACTIVATE INACTIVE DRIVERS
// =============================

export async function detectInactiveDrivers(city?: string): Promise<string[]> {
  let query = supabase
    .from("driver_profiles")
    .select("id, user_id")
    .eq("is_online", false)
    .eq("is_verified", true);

  if (city) query = query.eq("city", city);

  const { data } = await query.limit(50);
  return (data ?? []).map(d => d.user_id);
}

export async function generateDriverActivationMessages(driverUserIds: string[]) {
  return driverUserIds.map(uid => ({
    userId: uid,
    message: [
      "🚗 Vous êtes toujours inscrit sur Easy Locs !",
      "Des commandes vous attendent dans votre zone.",
      "👉 Activez-vous maintenant pour commencer à livrer.",
      "⚡ Bonus disponible pour les premiers connectés.",
    ].join("\n"),
    priority: "high" as const,
  }));
}
