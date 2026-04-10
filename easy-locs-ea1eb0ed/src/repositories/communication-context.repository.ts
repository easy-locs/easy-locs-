/**
 * communication-context.repository — DB operations for communication hub context panels.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchPropertyContext(orgId: string, tenantId: string) {
  const [leaseRes, rentRes, interventionRes, docRes] = await Promise.all([
    supabase.from("leases").select("id, lease_type, start_date, end_date, rent_amount, charges_amount, status, country").eq("org_id", orgId).eq("tenant_id", tenantId).order("start_date", { ascending: false }).limit(3),
    supabase.from("rent_calls").select("id, month, total_amount, paid, paid_amount, paid_date").eq("org_id", orgId).eq("tenant_id", tenantId).order("month", { ascending: false }).limit(6),
    supabase.from("interventions").select("id, title, status, priority, category, created_at").eq("org_id", orgId).eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(5),
    supabase.from("documents").select("id, title, doc_type, status, created_at").eq("org_id", orgId).eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(5),
  ]);
  return {
    leases: leaseRes.data || [],
    rentCalls: rentRes.data || [],
    interventions: interventionRes.data || [],
    documents: docRes.data || [],
  };
}

export async function fetchBookingContext(bookingId: string, bookingType: string) {
  let booking: any = null, service: any = null;
  if (bookingType === "marketplace") {
    const { data } = await supabase.from("marketplace_bookings").select("*").eq("id", bookingId).single();
    booking = data;
    if (data?.service_id) { const { data: svc } = await supabase.from("marketplace_services").select("id, title, description, price, currency, category, city, country, photo_urls, booking_slug").eq("id", data.service_id).single(); service = svc; }
  } else if (bookingType === "concierge") {
    const { data } = await supabase.from("concierge_orders").select("*").eq("id", bookingId).single();
    booking = data;
    if (data?.service_id) { const { data: svc } = await supabase.from("concierge_services").select("id, title, description, price, currency, category, city, country, photo_url").eq("id", data.service_id).single(); service = svc; }
  } else if (bookingType === "seasonal") {
    const { data } = await supabase.from("booking_requests").select("*").eq("id", bookingId).single();
    booking = data;
  }
  return { booking, service };
}
