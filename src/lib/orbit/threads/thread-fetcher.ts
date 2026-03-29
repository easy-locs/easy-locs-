/**
 * thread-fetcher — Atomic unit: fetch raw data sources for thread aggregation.
 * Single responsibility: parallel DB queries for all thread sources.
 */
import { supabase } from "@/integrations/supabase/client";

const trace = (step: string, phase: "input" | "output" | "error", payload?: Record<string, unknown>) => {
  const logger = phase === "error" ? console.error : console.log;
  logger(`[THREADS][${step}] ${phase}:`, payload ?? {});
};

export interface ThreadRawSources {
  tenants: any[];
  mBookings: any[];
  cOrders: any[];
  sBookings: any[];
  reLeads: any[];
  guestSessions: any[];
  propertyMap: Record<string, { label: string; country: string }>;
  mSvcMap: Record<string, { title: string; country: string }>;
  cSvcMap: Record<string, { title: string; country: string }>;
  sPropMap: Record<string, { label: string; country: string }>;
  listingMap: Record<string, { title: string; listing_type: string; country: string }>;
}

export async function fetchOrgThreadSources(orgId: string): Promise<ThreadRawSources> {
  trace("fetch.org", "input", { orgId });
  const emptyResult = { data: null };

  const [tenantRes, mBookingRes, cOrderRes, sBookingRes, reLeadRes, guestRes] = await Promise.all([
    supabase.from("tenants").select("id, name, email, tenant_user_id, property_id, lease_type").eq("org_id", orgId).order("name"),
    supabase.from("marketplace_bookings").select("id, booker_name, booker_email, booker_phone, status, total_price, currency, service_id, service_date, provider_id").eq("org_id", orgId).order("created_at", { ascending: false }).limit(200),
    supabase.from("concierge_orders").select("id, guest_name, guest_email, guest_phone, status, total_price, currency, service_id, service_date, property_label, property_id").eq("org_id", orgId).order("created_at", { ascending: false }).limit(200),
    supabase.from("booking_requests").select("id, guest_name, guest_email, guest_phone, status, check_in, check_out, property_id").eq("org_id", orgId).order("created_at", { ascending: false }).limit(200),
    supabase.from("real_estate_leads").select("id, name, email, phone, status, message, listing_id, created_at").eq("org_id", orgId).order("created_at", { ascending: false }).limit(200),
    supabase.from("guest_sessions").select("id, display_name, email, context_type, context_id, created_at, expires_at").eq("org_id", orgId).order("created_at", { ascending: false }).limit(50).then(r => r, () => emptyResult),
  ]);

  const tenants = tenantRes.data || [];
  const mBookings = mBookingRes.data || [];
  const cOrders = cOrderRes.data || [];
  const sBookings = sBookingRes.data || [];
  const reLeads = reLeadRes.data || [];
  const guestSessions = (guestRes as any).data || [];

  // Sub-lookups for related entities
  const propertyIds = tenants.filter(t => t.property_id).map(t => t.property_id!);
  const mSvcIds = [...new Set(mBookings.map(b => b.service_id).filter(Boolean))] as string[];
  const cSvcIds = [...new Set(cOrders.map(o => o.service_id).filter(Boolean))] as string[];
  const sPropIds = [...new Set(sBookings.map(b => b.property_id).filter(Boolean))] as string[];
  const listingIds = [...new Set(reLeads.map(l => l.listing_id).filter(Boolean))] as string[];

  const [propRes, mSvcRes, cSvcRes, sPropRes, listingRes] = await Promise.all([
    propertyIds.length > 0 ? supabase.from("properties").select("id, label, country").in("id", propertyIds) : { data: [] },
    mSvcIds.length > 0 ? supabase.from("marketplace_services").select("id, title, country").in("id", mSvcIds) : { data: [] },
    cSvcIds.length > 0 ? supabase.from("concierge_services").select("id, title, country").in("id", cSvcIds) : { data: [] },
    sPropIds.length > 0 ? supabase.from("properties").select("id, label, country").in("id", sPropIds) : { data: [] },
    listingIds.length > 0 ? supabase.from("real_estate_listings").select("id, title, listing_type, country").in("id", listingIds) : { data: [] },
  ]);

  const result: ThreadRawSources = {
    tenants,
    mBookings,
    cOrders,
    sBookings,
    reLeads,
    guestSessions,
    propertyMap: Object.fromEntries((propRes.data || []).map(p => [p.id, { label: p.label, country: p.country || "FR" }])),
    mSvcMap: Object.fromEntries((mSvcRes.data || []).map(s => [s.id, { title: s.title, country: s.country || "" }])),
    cSvcMap: Object.fromEntries((cSvcRes.data || []).map(s => [s.id, { title: s.title, country: s.country || "" }])),
    sPropMap: Object.fromEntries((sPropRes.data || []).map(p => [p.id, { label: p.label, country: p.country || "" }])),
    listingMap: Object.fromEntries((listingRes.data || []).map(l => [l.id, { title: l.title, listing_type: l.listing_type, country: l.country || "" }])),
  };

  trace("fetch.org", "output", {
    tenants: tenants.length,
    mBookings: mBookings.length,
    cOrders: cOrders.length,
    sBookings: sBookings.length,
    reLeads: reLeads.length,
    guestSessions: guestSessions.length,
  });

  return result;
}

export async function fetchV2Conversations(userId: string, _hasOrg: boolean): Promise<any[]> {
  trace("fetch.v2conversations", "input", { userId });

  // RLS on conversations_v2 already filters by participant orbitId.
  // No extra client-side filter needed — just fetch and let RLS do its job.
  const { data, error } = await (supabase as any)
    .from("conversations_v2")
    .select("*")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(300);

  if (error) {
    trace("fetch.v2conversations", "error", { message: error.message });
  }

  const raw = data || [];
  trace("fetch.v2conversations", "output", { rawCount: raw.length });
  return raw;
}

export async function fetchDeals(orgId: string): Promise<any[]> {
  const { data } = await supabase
    .from("deal_rooms")
    .select("*")
    .eq("org_id", orgId)
    .order("updated_at", { ascending: false })
    .limit(100);
  return data || [];
}

export async function fetchPreferences(userId: string): Promise<any[]> {
  const { data } = await supabase
    .from("conversation_preferences")
    .select("context_id, archived, muted, favorited, cleared_at")
    .eq("user_id", userId);
  return data || [];
}