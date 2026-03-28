/**
 * guest-portal.repository — All DB operations for GuestPortal page.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchGuestPortalData(bookingId: string) {
  const { data: bookingData } = await (supabase as any)
    .from("seasonal_bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();

  if (!bookingData) return null;

  const [{ data: property }, { data: services }, { data: activities }, { data: orgData }] = await Promise.all([
    supabase.from("properties").select("*").eq("id", bookingData.property_id).maybeSingle(),
    supabase.from("concierge_services_public" as any).select("*").eq("org_id", bookingData.org_id).order("sort_order"),
    supabase.from("activities_public" as any).select("*").eq("org_id", bookingData.org_id).order("sort_order"),
    supabase.from("orgs").select("name, email, phone, logo_url, brand_name").eq("id", bookingData.org_id).maybeSingle(),
  ]);

  return { booking: bookingData, property, services: services || [], activities: activities || [], org: orgData };
}

export async function createGuestServiceOrder(params: {
  orgId: string;
  serviceId: string;
  guestName: string;
  guestEmail: string;
  bookingId: string;
  serviceTitle: string;
}) {
  const { error } = await supabase.from("concierge_orders").insert({
    org_id: params.orgId,
    service_id: params.serviceId,
    guest_name: params.guestName,
    guest_email: params.guestEmail,
    property_label: `Guest Portal - ${params.bookingId}`,
    status: "pending",
    payment_status: "unpaid",
  } as any);
  if (error) throw error;
}

export async function createGuestNotification(userId: string, title: string, body: string, category: string) {
  await (supabase as any).from("app_notifications").insert({
    user_id: userId,
    scope: "global",
    category,
    title,
    body,
    severity: "info",
  });
}

export async function getOrgOwnerId(orgId: string): Promise<string | null> {
  const { data } = await supabase.from("orgs").select("owner_user_id").eq("id", orgId).single();
  return (data as any)?.owner_user_id || null;
}
