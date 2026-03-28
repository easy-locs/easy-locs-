/**
 * seasonal-repository — All seasonal rental DB reads/writes.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchSeasonalBookings(orgId: string) {
  const { data, error } = await supabase
    .from("stay_bookings")
    .select("*")
    .eq("org_id", orgId as any)
    .order("check_in", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createSeasonalBooking(orgId: string, userId: string, form: Record<string, any>) {
  const { data, error } = await supabase
    .from("stay_bookings")
    .insert({ ...form, org_id: orgId, user_id: userId } as any)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateSeasonalBooking(id: string, updates: Record<string, any>) {
  const { error } = await supabase.from("stay_bookings").update(updates as any).eq("id", id);
  if (error) throw error;
}

export async function deleteSeasonalBooking(id: string) {
  const { error } = await supabase.from("stay_bookings").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchSeasonalProperties(orgId: string) {
  const { data, error } = await supabase
    .from("properties")
    .select("id, label, photo_urls")
    .eq("org_id", orgId)
    .order("label");
  if (error) throw error;
  return data ?? [];
}
