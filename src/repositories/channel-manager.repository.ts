/**
 * channel-manager.repository — All DB operations for ChannelManager page.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchOrgByUserId(userId: string) {
  const { data } = await supabase
    .from("orgs")
    .select("id")
    .eq("owner_user_id", userId)
    .maybeSingle();
  return data;
}

export async function fetchChannelConnections(orgId: string) {
  const { data } = await (supabase as any)
    .from("ota_connections")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function fetchProperties(orgId: string) {
  const { data } = await supabase
    .from("properties")
    .select("id, label")
    .eq("org_id", orgId);
  return data || [];
}

export async function fetchReservationsUnified(orgId: string) {
  const [seasonal, bookingReqs] = await Promise.all([
    (supabase as any)
      .from("seasonal_bookings")
      .select("id, property_id, guest_name, guest_email, check_in, check_out, status, total_price")
      .eq("org_id", orgId),
    supabase
      .from("booking_requests")
      .select("id, property_id, guest_name, guest_email, check_in, check_out, status")
      .eq("org_id", orgId),
  ]);

  const reservations: any[] = [];
  (seasonal.data || []).forEach((b: any) =>
    reservations.push({ ...b, ota_provider: "direct", amount: b.total_price || 0, source_table: "seasonal_bookings" })
  );
  (bookingReqs.data || []).forEach((b: any) =>
    reservations.push({ ...b, ota_provider: "direct", amount: 0, source_table: "booking_requests" })
  );
  return reservations;
}

export async function createChannelConnection(orgId: string, provider: string, icalUrl: string, propertyId: string) {
  const { error } = await (supabase as any).from("ota_connections").insert({
    org_id: orgId,
    provider,
    ical_url: icalUrl,
    property_id: propertyId || null,
    sync_status: "pending",
  });
  if (error) throw error;
}

export async function deleteChannelConnection(id: string) {
  const { error } = await (supabase as any).from("ota_connections").delete().eq("id", id);
  if (error) throw error;
}

export async function syncChannelConnection(id: string) {
  const { error } = await (supabase as any)
    .from("ota_connections")
    .update({ sync_status: "syncing", last_synced_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  // Simulate sync delay
  await new Promise((r) => setTimeout(r, 2000));
  await (supabase as any)
    .from("ota_connections")
    .update({ sync_status: "active" })
    .eq("id", id);
}

export async function cancelReservation(id: string, sourceTable: string) {
  const { error } = await (supabase as any)
    .from(sourceTable)
    .update({ status: "cancelled" })
    .eq("id", id);
  if (error) throw error;
}

export async function updateReservationDates(id: string, sourceTable: string, checkIn: string, checkOut: string) {
  const { error } = await (supabase as any)
    .from(sourceTable)
    .update({ check_in: checkIn, check_out: checkOut })
    .eq("id", id);
  if (error) throw error;
}
