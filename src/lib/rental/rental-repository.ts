/**
 * rental-repository — All rental domain DB reads/writes.
 * No component should call supabase directly for rental data.
 */
import { supabase } from "@/integrations/supabase/client";

// ── Property CRUD ──

export async function fetchProperties(orgId: string) {
  const { data, error } = await supabase.from("properties").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createProperty(orgId: string, userId: string, form: Record<string, any>) {
  const { data, error } = await supabase.from("properties").insert({ ...form, org_id: orgId, user_id: userId } as any).select().single();
  if (error) throw error;
  return data;
}

export async function updateProperty(id: string, updates: Record<string, any>) {
  const { error } = await supabase.from("properties").update(updates as any).eq("id", id);
  if (error) throw error;
}

export async function deleteProperty(id: string) {
  const { error } = await supabase.from("properties").delete().eq("id", id);
  if (error) throw error;
}

// ── Tenant CRUD ──

export async function fetchTenants(orgId: string) {
  const { data, error } = await supabase.from("tenants").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createTenant(orgId: string, userId: string, form: Record<string, any>) {
  const { data, error } = await supabase.from("tenants").insert({ ...form, org_id: orgId, user_id: userId } as any).select().single();
  if (error) throw error;
  return data;
}

export async function updateTenant(id: string, updates: Record<string, any>) {
  const { error } = await supabase.from("tenants").update(updates as any).eq("id", id);
  if (error) throw error;
}

export async function deleteTenant(id: string) {
  const { error } = await supabase.from("tenants").delete().eq("id", id);
  if (error) throw error;
}

// ── Rent Calls ──

export async function fetchRentCalls(orgId: string) {
  const { data, error } = await supabase.from("rent_calls").select("*").eq("org_id", orgId).order("due_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createRentCall(orgId: string, call: Record<string, any>) {
  const { data, error } = await supabase.from("rent_calls").insert({ ...call, org_id: orgId } as any).select().single();
  if (error) throw error;
  return data;
}

export async function updateRentCall(id: string, updates: Record<string, any>) {
  const { error } = await supabase.from("rent_calls").update(updates as any).eq("id", id);
  if (error) throw error;
}

export async function fetchLeases(orgId: string) {
  const { data, error } = await supabase.from("leases").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ── Property Detail (expenses, furniture, inventories) ──

export async function fetchPropertyDetail(orgId: string, propertyId: string) {
  const [{ data: expenses }, { data: furniture }, { data: inventories }] = await Promise.all([
    supabase.from("expenses").select("*").eq("org_id", orgId).eq("property_id", propertyId).order("expense_date", { ascending: false }),
    supabase.from("furniture_items").select("*").eq("org_id", orgId).eq("property_id", propertyId),
    supabase.from("inventory_reports").select("*").eq("org_id", orgId).eq("property_id", propertyId).order("report_date", { ascending: false }),
  ]);
  return { expenses: expenses ?? [], furniture: furniture ?? [], inventories: inventories ?? [] };
}

// ── Mode badges (seasonal + sale listings) ──

export async function fetchPropertyModeBadges(orgId: string) {
  const [{ data: seasonal }, { data: realEstate }] = await Promise.all([
    supabase.from("public_listings").select("property_id").eq("org_id", orgId).eq("active", true),
    (supabase as any).from("real_estate_listings").select("property_id, listing_type").eq("org_id", orgId).eq("status", "active"),
  ]);
  return {
    seasonalIds: new Set<string>((seasonal ?? []).map((s: any) => s.property_id).filter(Boolean)),
    saleIds: new Set<string>((realEstate ?? []).filter((r: any) => r.listing_type === "sale").map((r: any) => r.property_id).filter(Boolean)),
  };
}

// ── Landlord profile ──

export async function fetchLandlordProfile(userId: string, orgId?: string) {
  let name = "", address = "", signature = "", stamp = "";
  try {
    const { data: profile } = await supabase.from("profiles").select("name, email, signature_url").eq("id", userId).single();
    if (profile?.name) name = profile.name;
    if (profile?.signature_url) signature = profile.signature_url;
  } catch { /* defaults */ }

  if (orgId) {
    try {
      const { data: op } = await supabase.from("owner_profiles").select("full_name, address, postal_code, city").eq("org_id", orgId).limit(1).maybeSingle();
      if (op) { name = op.full_name || name; address = [op.address, op.postal_code, op.city].filter(Boolean).join(", "); }
    } catch { /* ignore */ }
    try {
      const { data: org } = await supabase.from("orgs").select("name, address, postal_code, city, stamp_url").eq("id", orgId).single();
      if (org) { if (!name) name = org.name || ""; if (!address) address = [org.address, org.postal_code, org.city].filter(Boolean).join(", "); if ((org as any)?.stamp_url) stamp = (org as any).stamp_url; }
    } catch { /* ignore */ }
  }
  return { name, address, signature, stamp };
}

// ── Rental messages ──

export async function fetchRentalMessages(orgId: string, tenantId: string) {
  const contextId = `tenant_${orgId}_${tenantId}`;
  const { data } = await (supabase as any).from("chat_messages_v2").select("*").eq("conversation_id", contextId).order("created_at", { ascending: true });
  return data ?? [];
}

export async function sendRentalMessage(orgId: string, tenantId: string, userId: string, body: string) {
  const contextId = `tenant_${orgId}_${tenantId}`;
  const { error } = await (supabase as any).from("chat_messages_v2").insert({
    conversation_id: contextId, sender_user_id: userId,
    sender_orbit_id: `orbit_${userId.slice(0, 12)}`, type: "text", body,
  });
  if (error) throw error;
}

export async function sendRentalNotification(tenantUserId: string, title: string, body: string) {
  await (supabase as any).from("app_notifications").insert({
    user_id: tenantUserId, scope: "global", category: "message",
    title, body, severity: "info", route: "/tenant/messages",
  });
}

// ── Realtime subscription ──

export function subscribeRentalMessages(tenantId: string, onInsert: (msg: any) => void, onUpdate: (msg: any) => void) {
  const channel = supabase
    .channel(`rental-msg-${tenantId}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages_v2" }, (payload) => {
      const newMsg = payload.new as any;
      if (newMsg.metadata?.tenant_id === tenantId || newMsg.conversation_id?.includes(tenantId)) onInsert(newMsg);
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages_v2" }, (payload) => {
      onUpdate(payload.new as any);
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// ── Document insert ──

export async function insertDocument(orgId: string, userId: string, title: string, docType: string, templateId: string, templateVersion: string, dataJson: Record<string, unknown>, country: string) {
  await supabase.from("documents").insert({
    org_id: orgId, user_id: userId, title, doc_type: docType,
    template_id: templateId, template_version: templateVersion,
    data_json: dataJson as any, status: "draft", country,
  } as any);
}
