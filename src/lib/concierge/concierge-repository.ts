/**
 * concierge-repository — All concierge service DB reads/writes.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchConciergeServices(orgId: string) {
  const { data, error } = await supabase
    .from("concierge_services")
    .select("*")
    .eq("org_id", orgId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createConciergeService(orgId: string, userId: string, form: Record<string, any>) {
  const { data, error } = await supabase
    .from("concierge_services")
    .insert({ ...form, org_id: orgId, user_id: userId } as any)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateConciergeService(id: string, updates: Record<string, any>) {
  const { error } = await supabase.from("concierge_services").update(updates as any).eq("id", id);
  if (error) throw error;
}

export async function deleteConciergeService(id: string) {
  const { error } = await supabase.from("concierge_services").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchConciergeBookings(orgId: string) {
  const { data, error } = await (supabase as any)
    .from("concierge_bookings")
    .select("*, concierge_services(title, category)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateBookingStatus(bookingId: string, status: string) {
  const { error } = await (supabase as any)
    .from("concierge_bookings")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", bookingId);
  if (error) throw error;
}
