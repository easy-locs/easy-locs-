/**
 * Property Calendar Repository — All DB access for PropertyCalendar page.
 */
import { supabase } from "@/integrations/supabase/client";

export interface CalendarPropertyOption {
  id: string;
  label: string;
  country: string;
}

export async function fetchCalendarProperties(orgId: string, country?: string | null): Promise<CalendarPropertyOption[]> {
  let q = supabase.from("properties").select("id, label, country").eq("org_id", orgId);
  if (country) q = q.eq("country", country);
  const { data } = await q;
  return (data || []) as CalendarPropertyOption[];
}

export async function fetchSeasonalEvents(orgId: string, propertyIds: string[]) {
  const { data } = await supabase
    .from("booking_requests")
    .select("*, properties!booking_requests_property_id_fkey(label)")
    .eq("org_id", orgId)
    .in("property_id", propertyIds);
  return data || [];
}

export async function fetchLeaseEvents(orgId: string, propertyIds: string[]) {
  const { data } = await supabase
    .from("leases")
    .select("*, tenants!leases_tenant_id_fkey(name, email, phone), properties!leases_property_id_fkey(label)")
    .eq("org_id", orgId)
    .in("property_id", propertyIds);
  return data || [];
}

export async function fetchMarketplaceEvents(orgId: string) {
  const { data } = await supabase
    .from("marketplace_bookings")
    .select("*")
    .eq("org_id", orgId)
    .not("property_id", "is", null);
  return data || [];
}

export async function fetchConciergeEvents(orgId: string, propertyIds: string[]) {
  const { data } = await supabase
    .from("concierge_orders")
    .select("*")
    .eq("org_id", orgId)
    .in("property_id", propertyIds);
  return data || [];
}

export async function fetchBlockedDates(orgId: string, propertyIds: string[]) {
  const { data } = await supabase
    .from("property_blocked_dates")
    .select("*, properties!property_blocked_dates_property_id_fkey(label)")
    .eq("org_id", orgId)
    .in("property_id", propertyIds);
  return data || [];
}

export async function insertBlockedDate(params: {
  org_id: string;
  property_id: string;
  date_from: string;
  date_to: string;
  reason?: string;
}) {
  const { error } = await supabase.from("property_blocked_dates").insert(params);
  if (error) throw error;
}

export async function deleteBlockedDate(id: string) {
  const { error } = await supabase.from("property_blocked_dates").delete().eq("id", id);
  if (error) throw error;
}
