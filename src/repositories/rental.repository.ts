/**
 * rental.repository — All DB ops for rental hooks and components.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

// ── Lease workflow ──
export async function fetchLease(leaseId: string) {
  const { data } = await supabase.from("leases").select("*").eq("id", leaseId).single();
  return data;
}

export async function updateLease(leaseId: string, updates: Record<string, any>) {
  const { error } = await supabase.from("leases").update(updates as any).eq("id", leaseId);
  if (error) throw error;
}

export async function fetchLeasesByOrg(orgId: string) {
  const { data } = await supabase.from("leases").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
  return data ?? [];
}

// ── Receipts ──
export async function fetchRentCalls(orgId: string, filters?: Record<string, any>) {
  let q = supabase.from("rent_calls").select("*").eq("org_id", orgId);
  if (filters?.paid !== undefined) q = q.eq("paid", filters.paid);
  if (filters?.tenantId) q = q.eq("tenant_id", filters.tenantId);
  const { data } = await q.order("month", { ascending: false });
  return data ?? [];
}

export async function updateRentCall(id: string, updates: Record<string, any>) {
  const { error } = await supabase.from("rent_calls").update(updates as any).eq("id", id);
  if (error) throw error;
}

// ── Messages (rental) ──
export async function fetchRentalMessages(orgId: string) {
  const { data } = await (supabase as any).from("chat_messages_v2").select("*").ilike("conversation_id", `tenant_${orgId}_%`).order("created_at", { ascending: false }).limit(500);
  return data ?? [];
}

export async function insertRentalMessage(record: Record<string, any>) {
  const { data, error } = await (supabase as any).from("chat_messages_v2").insert(record).select("*").single();
  if (error) throw error;
  return data;
}

export function subscribeRentalMessages(orgId: string, onInsert: (msg: any) => void) {
  const channel = supabase.channel(`rental-msgs-${orgId}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages_v2" }, (payload) => {
      const msg = payload.new as any;
      if (msg?.conversation_id?.startsWith(`tenant_${orgId}_`)) onInsert(msg);
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// ── Notifications ──
export async function fetchRentalNotifications(userId: string) {
  const { data } = await (supabase as any).from("app_notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
  return data ?? [];
}

export async function markNotificationsRead(userId: string, ids: string[]) {
  await (supabase as any).from("app_notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
}

export async function insertNotification(record: Record<string, any>) {
  await (supabase as any).from("app_notifications").insert(record);
}

// ── Realtime bridge ──
export function subscribeRentCalls(orgId: string, onUpdate: (payload: any) => void) {
  const channel = supabase.channel(`rent-calls-${orgId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "rent_calls", filter: `org_id=eq.${orgId}` }, onUpdate)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

export function subscribeLeases(orgId: string, onUpdate: (payload: any) => void) {
  const channel = supabase.channel(`leases-${orgId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "leases", filter: `org_id=eq.${orgId}` }, onUpdate)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// ── Auto-generate lease ──
export async function fetchTenantForLeaseGen(tenantId: string) {
  const { data } = await supabase.from("tenants").select("*").eq("id", tenantId).single();
  return data;
}

export async function fetchPropertyForLeaseGen(propertyId: string) {
  const { data } = await supabase.from("properties").select("*").eq("id", propertyId).single();
  return data;
}

export async function invokeGenerateDocument(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("generate-document" as any, { body });
  if (error) throw error;
  return data;
}

// ── Reminders ──
export async function fetchReminders(orgId: string) {
  const { data } = await (supabase as any).from("reminders").select("*").eq("org_id", orgId).order("due_date");
  return data ?? [];
}

export async function insertReminder(record: Record<string, any>) {
  const { data, error } = await (supabase as any).from("reminders").insert(record).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateReminder(id: string, updates: Record<string, any>) {
  const { error } = await (supabase as any).from("reminders").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteReminder(id: string) {
  const { error } = await (supabase as any).from("reminders").delete().eq("id", id);
  if (error) throw error;
}

// ── Vault ──
export async function fetchVaultFiles(orgId: string) {
  const { data } = await supabase.from("vault_files").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
  return data ?? [];
}

export async function insertVaultFile(record: Record<string, any>) {
  const { error } = await (supabase as any).from("vault_files").insert(record);
  if (error) throw error;
}

export async function deleteVaultFile(fileId: string, fileUrl: string) {
  await supabase.storage.from("vault").remove([fileUrl]);
  const { error } = await supabase.from("vault_files").delete().eq("id", fileId);
  if (error) throw error;
}

export async function uploadVaultFile(path: string, file: File) {
  const { error } = await supabase.storage.from("vault").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("vault").getPublicUrl(path);
  return data.publicUrl;
}

// ── Charges regularization ──
export async function fetchChargesData(orgId: string) {
  const { data: tenants } = await supabase.from("tenants").select("id, name, charges_amount, property_id").eq("org_id", orgId);
  const { data: rentCalls } = await supabase.from("rent_calls").select("id, tenant_id, month, charges_amount, paid").eq("org_id", orgId);
  return { tenants: tenants ?? [], rentCalls: rentCalls ?? [] };
}

// ── Fiscal ──
export async function fetchFiscalData(orgId: string, year: number) {
  const startMonth = `${year}-01`;
  const endMonth = `${year}-12`;
  const { data: rentCalls } = await supabase.from("rent_calls").select("*").eq("org_id", orgId).gte("month", startMonth).lte("month", endMonth);
  const { data: entries } = await supabase.from("accounting_entries").select("*").eq("org_id", orgId).gte("accounting_period", startMonth).lte("accounting_period", endMonth);
  return { rentCalls: rentCalls ?? [], entries: entries ?? [] };
}

// ── Accounting entries ──
export async function fetchAccountingEntries(orgId: string) {
  const { data } = await supabase.from("accounting_entries").select("*").eq("org_id", orgId).order("accounting_period", { ascending: false });
  return data ?? [];
}

export async function insertAccountingEntry(record: Record<string, any>) {
  const { error } = await (supabase as any).from("accounting_entries").insert(record);
  if (error) throw error;
}

// ── Tenant documents (rental component) ──
export async function fetchTenantDocsForProperty(orgId: string, tenantId: string) {
  const { data } = await supabase.from("tenant_documents").select("*").eq("org_id", orgId).eq("tenant_id", tenantId).order("created_at", { ascending: false });
  return data ?? [];
}

// ── Tenant requests (rental component) ──
export async function fetchTenantRequests(orgId: string) {
  const { data } = await (supabase as any).from("document_requests").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
  return data ?? [];
}

export async function updateDocumentRequest(id: string, updates: Record<string, any>) {
  const { error } = await (supabase as any).from("document_requests").update(updates).eq("id", id);
  if (error) throw error;
}

// ── Lease Signature Workflow ──
export async function fetchLeaseForSignature(leaseId: string) {
  const { data } = await supabase.from("leases").select("tenant_signed_at, org_id").eq("id", leaseId).single();
  return data;
}

export async function updateLeaseSignature(leaseId: string, party: "tenant" | "owner", signedAt: string, signatureUrl?: string) {
  const updates: Record<string, any> = party === "tenant"
    ? { tenant_signed_at: signedAt, status: "signed" }
    : { owner_signed_at: signedAt };
  const { data, error } = await supabase.from("leases").update(updates as any).eq("id", leaseId).select("*").single();
  if (error) throw error;
  if (signatureUrl) {
    const docUpdate: Record<string, any> = party === "tenant"
      ? { tenant_signature_url: signatureUrl, signed_by_tenant_at: signedAt }
      : { owner_signature_url: signatureUrl, signed_by_owner_at: signedAt };
    await supabase.from("documents").update(docUpdate).eq("lease_id", leaseId);
  }
  return data;
}

export async function updateLeaseOwnerSignature(leaseId: string, signedAt: string, newStatus: string, signatureUrl?: string) {
  const { data, error } = await supabase.from("leases").update({ owner_signed_at: signedAt, status: newStatus } as any).eq("id", leaseId).select("*").single();
  if (error) throw error;
  if (signatureUrl) {
    await supabase.from("documents").update({ owner_signature_url: signatureUrl, signed_by_owner_at: signedAt, status: newStatus === "active" ? "signed" : "pending_signature" }).eq("lease_id", leaseId);
  }
  return data;
}

export async function insertLeaseAuditLog(orgId: string | undefined, action: string, metadata: Record<string, any>) {
  await (supabase as any).from("audit_logs").insert({ user_id: null, org_id: orgId, action, metadata_json: metadata });
}

// ── Document requests ──
export async function fetchDocumentRequests(tenantId: string) {
  const { data } = await supabase.from("document_requests").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
  return data || [];
}

export async function resolveDocumentRequest(requestId: string) {
  const { error } = await supabase.from("document_requests").update({ status: "resolved", resolved_at: new Date().toISOString() } as any).eq("id", requestId);
  if (error) throw error;
}

export async function fetchTenantUserId(tenantId: string) {
  const { data } = await supabase.from("tenants").select("tenant_user_id").eq("id", tenantId).single();
  return data?.tenant_user_id as string | null;
}

export async function insertAppNotification(payload: Record<string, any>) {
  await (supabase as any).from("app_notifications").insert(payload);
}

// ── Fiscal report ──
export async function fetchPropertiesForOrg(orgId: string, countryFilter?: string) {
  let q = supabase.from("properties").select("id, label, monthly_rent, monthly_charges, address, city, country").eq("org_id", orgId);
  if (countryFilter) q = q.eq("country", countryFilter);
  const { data } = await q;
  return data || [];
}

export async function fetchRentCallsForOrg(orgId: string) {
  const { data } = await supabase.from("rent_calls").select("month, rent_amount, charges_amount, total_amount, paid, property_id").eq("org_id", orgId);
  return data || [];
}

// ── Charges regularization ──
export async function fetchTenantsForCharges(orgId: string) {
  const { data } = await supabase.from("tenants").select("id, name, charges_amount, property_id").eq("org_id", orgId);
  return data || [];
}

export async function fetchPropertiesMinimal(orgId: string) {
  const { data } = await supabase.from("properties").select("id, label, monthly_charges, country").eq("org_id", orgId);
  return data || [];
}

// ── Reminders ──
export async function deactivateReminder(id: string) {
  await supabase.from("reminders").update({ active: false } as any).eq("id", id);
}

// ── Add property ──
export async function insertProperty(payload: Record<string, any>) {
  const { error } = await (supabase as any).from("properties").insert(payload);
  if (error) throw error;
}

// ── Referrals ──
export async function fetchReferralCode(userId: string) {
  const { data } = await supabase.from("profiles").select("referral_code").eq("id", userId).single();
  return data;
}

export async function fetchReferrals(userId: string) {
  const { data } = await supabase.from("referrals").select("*").eq("referrer_user_id", userId).order("created_at", { ascending: false });
  return data || [];
}

// ── Profile settings ──
export async function fetchProfilePrivacy(userId: string, columns: string) {
  const { data } = await supabase.from("profiles").select(columns).eq("id", userId).single();
  return data;
}

export async function updateProfileField(userId: string, column: string, value: any) {
  await supabase.from("profiles").update({ [column]: value } as any).eq("id", userId);
}

// ── Tenant signup ──
export async function validateTenantInvitation(token: string) {
  const { data, error } = await supabase.rpc("validate_tenant_invitation", { _token: token });
  if (error) throw error;
  return data;
}

export async function invokeTenantSignup(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("tenant-signup", { body });
  if (error) throw error;
  return data;
}

// ── Send email (for lease workflow / seasonal) ──
export async function invokeSendEmail(body: Record<string, any>) {
  const { error } = await supabase.functions.invoke("send-email", { body });
  if (error) throw error;
}

// ── Lease workflow edge function ──
export async function invokeLeaseWorkflow(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("lease-workflow", { body });
  if (error) throw error;
  return data;
}

// ── Accounting entries ──
export async function fetchPropertiesForAccounting(orgId: string) {
  const { data } = await supabase.from("properties").select("id, label, country").eq("org_id", orgId);
  return data || [];
}

// ── Landlord rent dashboard properties ──
export async function fetchPropertyIdsForCountry(orgId: string, country: string) {
  const { data } = await supabase.from("properties").select("id").eq("org_id", orgId).eq("country", country);
  return (data || []).map((p: any) => p.id);
}

// ── Fiscal report queries (extended) ──
export async function fetchPropertiesForFiscalReport(orgId: string, countryFilter?: string) {
  let q = supabase.from("properties").select("id, label, monthly_rent, monthly_charges, address, city, country").eq("org_id", orgId);
  if (countryFilter) q = q.eq("country", countryFilter);
  const { data } = await q;
  return data || [];
}

// ── Reminders ──
export async function dismissReminder(id: string) {
  await supabase.from("reminders").update({ active: false } as any).eq("id", id);
}

// ── Inventory report full ──
export async function fetchInventoryReportFull(reportId: string) {
  const { data } = await supabase.from("inventory_reports").select("*").eq("id", reportId).single();
  return data;
}

// ── Booking requests ──
export async function insertBookingRequest(payload: Record<string, any>) {
  const { data, error } = await supabase.from("booking_requests").insert(payload as any).select().single();
  if (error) throw error;
  return data;
}

export async function invokeNotifyBooking(bookingRequestId: string) {
  await supabase.functions.invoke("notify-booking", { body: { booking_request_id: bookingRequestId } });
}

// ── Local services ──
export async function fetchOrgLocalServicesEnabled(orgId: string) {
  const { data } = await supabase.from("orgs").select("local_services_enabled").eq("id", orgId).single();
  return data?.local_services_enabled || false;
}

export async function fetchLocalServices(orgId: string) {
  const { data } = await supabase.from("local_services" as any).select("*").eq("org_id", orgId).eq("active", true).order("sort_order");
  return data || [];
}

// ── Newsletter ──
export async function insertNewsletterSubscriber(email: string) {
  const { error } = await (supabase as any).from("newsletter_subscribers").insert({ email });
  if (error) throw error;
}

// ── Auth context helpers ──
export async function checkTenantLink(userId: string) {
  const { data } = await supabase.from("tenants").select("id").eq("tenant_user_id", userId).limit(1).maybeSingle();
  return data;
}

export async function checkOrgLink(userId: string) {
  const { data } = await supabase.from("org_members").select("id").eq("user_id", userId).limit(1).maybeSingle();
  return data;
}

export async function markOnboardingComplete(userId: string) {
  await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", userId);
}

// ── Upload booking document ──
export async function uploadBookingDocument(path: string, file: File) {
  const { error } = await supabase.storage.from("booking-documents").upload(path, file, { upsert: true });
  if (error) throw error;
}

// ── Inventory reports (detailed) ──
export async function fetchInventoryReports(orgId: string) {
  const { data } = await supabase.from("inventory_reports").select("id, property_id, tenant_id, report_type, report_date, status").eq("org_id", orgId).order("report_date", { ascending: false });
  return data || [];
}

export async function fetchInventoryReportById(reportId: string) {
  const { data } = await supabase.from("inventory_reports").select("*").eq("id", reportId).single();
  return data;
}

export async function fetchInventoryRooms(reportId: string) {
  const { data } = await supabase.from("inventory_rooms").select("*").eq("report_id", reportId).order("sort_order");
  return data || [];
}

export async function fetchInventoryItems(roomId: string) {
  const { data } = await supabase.from("inventory_items").select("*").eq("room_id", roomId).order("sort_order");
  return data || [];
}

// ── Charges regularization ──
export async function fetchChargesRegTenants(orgId: string) {
  const { data } = await supabase.from("tenants").select("id, name, charges_amount, property_id").eq("org_id", orgId);
  return data || [];
}

export async function fetchChargesRegProperties(orgId: string) {
  const { data } = await supabase.from("properties").select("id, label, monthly_charges, country").eq("org_id", orgId);
  return data || [];
}

// ── Fiscal report ──
export async function fetchFiscalProperties(orgId: string, countryFilter?: string) {
  let query = supabase.from("properties").select("id, label, monthly_rent, monthly_charges, address, city, country").eq("org_id", orgId);
  if (countryFilter) query = query.eq("country", countryFilter);
  const { data } = await query;
  return data || [];
}

export async function fetchFiscalRentCalls(orgId: string) {
  const { data } = await supabase.from("rent_calls").select("month, rent_amount, charges_amount, total_amount, paid, property_id").eq("org_id", orgId);
  return data || [];
}

// ── Rent dashboard ──
export async function fetchPropertiesByCountry(orgId: string, country: string) {
  const { data } = await supabase.from("properties").select("id").eq("org_id", orgId).eq("country", country);
  return data || [];
}

// ── Existing bookings for availability ──
export async function fetchExistingBookings(propertyId: string) {
  const [{ data: seasonal }, { data: requests }] = await Promise.all([
    db.from("seasonal_bookings").select("check_in, check_out, status").eq("property_id", propertyId).neq("status", "cancelled"),
    supabase.from("booking_requests").select("check_in, check_out, status").eq("property_id", propertyId).in("status", ["confirmed", "paid", "approved", "payment_pending"]),
  ]);
  return [
    ...(seasonal || []).map((b: any) => ({ check_in: b.check_in, check_out: b.check_out })),
    ...(requests || []).map((b: any) => ({ check_in: b.check_in, check_out: b.check_out })),
  ];
}

// ── QR resolved card helpers ──
export async function fetchProfileName(userId: string) {
  const { data } = await supabase.from("profiles").select("name").eq("id", userId).maybeSingle();
  return data?.name || null;
}

export async function fetchContactExists(ownerId: string, contactUserId: string) {
  const { data } = await supabase.from("contacts").select("id").eq("owner_id", ownerId).eq("contact_user_id", contactUserId).maybeSingle();
  return !!data;
}

// ── Marketplace services ──
export async function insertMarketplaceService(payload: Record<string, any>) {
  const { error } = await supabase.from("marketplace_services").insert(payload as any);
  if (error) throw error;
}

export async function fetchServiceBySlug(slug: string) {
  const { data } = await supabase.from("marketplace_services").select("id").eq("booking_slug", slug).maybeSingle();
  return data;
}

// ── Parcel job details ──
export async function insertParcelJobDetails(payload: Record<string, any>) {
  await db.from("parcel_job_details").insert(payload);
}

// ── Audit reports ──
export async function fetchAuditHistory(limit = 30) {
  const { data } = await supabase.from("audit_reports").select("created_at, global_score, total_issues, scan_type").order("created_at", { ascending: false }).limit(limit);
  return data || [];
}

// ── Key bundles ──
export async function upsertKeyBundle(userId: string, publicKey: string, deviceId: string) {
  await db.from("user_key_bundles").upsert({
    user_id: userId, identity_public_key: publicKey, device_id: deviceId, updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
}

// ── Storefront pages (for health check) ──
export async function healthCheckDb() {
  const start = performance.now();
  const { data, error, status } = await supabase.from("storefront_pages").select("id").limit(1);
  const elapsed = performance.now() - start;
  return { data, error, status, elapsed };
}

// ── Dispatch ride ──
export async function invokeDispatchRide(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("dispatch-ride", { body });
  if (error) throw error;
  return data;
}

// ── Storefront orders ──
export async function updateStorefrontOrder(orderId: string, updates: Record<string, any>) {
  await db.from("storefront_orders").update(updates).eq("id", orderId);
}

// ── Shop follows ──
export async function fetchShopFollow(userId: string, shopId: string) {
  const { data } = await supabase.from("shop_follows").select("user_id, shop_id").eq("user_id", userId).eq("shop_id", shopId).maybeSingle() as any;
  return !!data;
}

// ── Shop by slug ──
export async function fetchShopBySlug(slug: string) {
  const { data } = await supabase.from("storefront_pages").select("id, slug, name, user_id").eq("slug", slug).maybeSingle();
  return data;
}

// ── Conversations v2 direct threads ──
export async function fetchDirectThreads(limit = 100) {
  const { data } = await db.from("conversations_v2").select("id, participants").eq("type", "direct").order("updated_at", { ascending: false }).limit(limit);
  return data || [];
}

// ── Dual role check ──
export async function checkTenantAndOrgLinks(userId: string) {
  const t = await supabase.from("tenants").select("id").eq("tenant_user_id", userId).limit(1).maybeSingle();
  const o = await supabase.from("org_members").select("id").eq("user_id", userId).limit(1).maybeSingle();
  return { hasTenant: !!t.data, hasOrg: !!o.data };
}

// ── Mark onboarding (fire-and-forget) ──
export async function markOnboardingCompleteFireAndForget(userId: string) {
  supabase.from("profiles").update({ onboarding_completed: true }).eq("id", userId).then(() => {});
}

// ── Booking payment ──
export async function invokeCreateBookingPayment(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("create-booking-payment", { body });
  if (error) throw error;
  return data;
}

// ── Accounting entries properties ──
export async function fetchAccountingProperties(orgId: string) {
  const { data } = await supabase.from("properties").select("id, label, country").eq("org_id", orgId);
  return data || [];
}

// ── Reminders ──
export async function fetchRemindersForOrg(orgId: string) {
  const { data } = await supabase.from("reminders").select("id, type, label, next_run_at, active").eq("org_id", orgId).eq("active", true).order("next_run_at", { ascending: true });
  return data || [];
}

// ── Accounting entries ──
// (fetchAccountingEntries already defined above)

// ── Peer key bundles ──
export async function fetchPeerKeyBundle(peerId: string) {
  const { data } = await (supabase as any).from("user_key_bundles").select("identity_public_key").eq("user_id", peerId).maybeSingle();
  return (data as any)?.identity_public_key as string | undefined;
}

// ── Group members ──
export async function fetchGroupMemberIds(userId: string) {
  const { data } = await supabase.from("group_members").select("group_id").eq("user_id", userId);
  return (data || []).map((r: any) => r.group_id).filter(Boolean);
}

export async function fetchGroupConversations() {
  const { data, error } = await (supabase as any).from("conversations_v2").select("*").in("type", ["group", "channel", "community"]).order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function fetchGroupMemberCount(groupId: string) {
  const { count } = await supabase.from("group_members").select("*", { count: "exact", head: true }).eq("group_id", groupId);
  return count || 0;
}

export async function fetchGroupLastMessage(groupId: string) {
  const { data } = await (supabase as any).from("chat_messages_v2").select("body, created_at").eq("conversation_id", groupId).order("created_at", { ascending: false }).limit(1);
  return data?.[0] || null;
}

export async function createGroupConversation(payload: Record<string, any>) {
  const { data, error } = await (supabase as any).from("conversations_v2").insert(payload).select("id, type, title, created_at, created_by_orbit_id").single();
  if (error) throw error;
  return data;
}

export async function insertGroupMember(groupId: string, userId: string, role: string) {
  await supabase.from("group_members").insert({ group_id: groupId, user_id: userId, role } as any);
}

// ── Chat messages v2 (payment) ──
export async function insertChatMessageV2(payload: Record<string, any>) {
  const { error } = await (supabase as any).from("chat_messages_v2").insert(payload);
  if (error) throw error;
}

export async function updateConversationTimestamp(conversationId: string) {
  await (supabase as any).from("conversations_v2").update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", conversationId);
}

export async function insertWalletTransaction(payload: Record<string, any>) {
  await (supabase as any).from("unified_wallet_transactions").insert(payload);
}

export async function fetchLeasesByOrgSimple(orgId: string) {
  const { data } = await supabase.from("leases").select("*").eq("org_id", orgId);
  return data || [];
}

// ── Charges Regularization (properties) ──
export async function fetchPropertiesForCharges(orgId: string) {
  const { data } = await supabase.from("properties").select("id, label, monthly_charges, country").eq("org_id", orgId);
  return data || [];
}

// ── Fiscal report (rent calls raw) ──
export async function fetchFiscalRentCallsRaw(orgId: string) {
  const { data } = await supabase.from("rent_calls").select("month, rent_amount, charges_amount, total_amount, paid, property_id").eq("org_id", orgId);
  return data || [];
}

// ── Rent cockpit ──
export async function fetchRentCockpit(orgId: string, countryFilter?: string | null) {
  let query = supabase
    .from("rent_calls")
    .select("id, tenant_id, property_id, lease_id, month, rent_amount, charges_amount, total_amount, paid, paid_amount, paid_date, payment_status, payment_method, receipt_pdf_url, receipt_validated, tenants(name, email), properties(label, city, country)")
    .eq("org_id", orgId)
    .order("month", { ascending: false });

  if (countryFilter) {
    const { data: props } = await supabase.from("properties").select("id").eq("org_id", orgId).eq("country", countryFilter);
    const ids = (props || []).map((p: any) => p.id);
    if (ids.length > 0) query = query.in("property_id", ids);
    else return [];
  }

  const { data } = await query.limit(500);
  return data || [];
}

// ── Audit reports history ──
export async function fetchAuditReportsHistory(limit = 30) {
  const { data } = await supabase
    .from("audit_reports")
    .select("created_at, global_score, total_issues, scan_type")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data || [];
}

// ── Marketplace service slug lookup ──
export async function fetchMarketplaceServiceBySlug(slug: string) {
  const { data } = await supabase.from("marketplace_services").select("id").eq("booking_slug", slug).maybeSingle();
  return data;
}

// ── Active listings count ──
export async function countActiveListings(orgId: string) {
  const { count } = await db.from("marketplace_services").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("active", true);
  return count ?? 0;
}

// ── Ensure marketplace provider ──
export async function ensureMarketplaceProvider(orgId: string, userId: string, defaults: Record<string, any>) {
  let { data: provider } = await db.from("marketplace_providers").select("id").eq("org_id", orgId).maybeSingle();
  if (!provider) {
    const { data: newProvider, error } = await db.from("marketplace_providers").insert({ org_id: orgId, user_id: userId, ...defaults }).select("id").single();
    if (error) throw error;
    provider = newProvider;
  }
  return provider;
}

// ── Booking document upload ──
export async function uploadBookingDocumentFile(path: string, file: File, contentType?: string) {
  const { error } = await supabase.storage.from("booking-documents").upload(path, file, { upsert: true, ...(contentType ? { contentType } : {}) });
  if (error) throw error;
}

export function getBookingDocumentPublicUrl(path: string) {
  return supabase.storage.from("booking-documents").getPublicUrl(path).data.publicUrl;
}

export async function signBookingDocumentUrl(path: string, expiresIn = 3600) {
  const { data } = await supabase.storage.from("booking-documents").createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
}

export async function updateDocumentUrls(tableName: string, bookingId: string, urls: string[]) {
  await db.from(tableName).update({ document_urls: urls }).eq("id", bookingId);
}

// ── Driver earnings data ──
export async function fetchDriverEarningsData(userId: string) {
  const { data: wallet } = await db.from("wallet_accounts").select("*").eq("owner_type", "driver").eq("owner_user_id", userId).limit(1).maybeSingle();
  const walletId = wallet?.id ?? "none";
  const { data: allSplits } = await db.from("wallet_order_splits").select("net_amount, split_status, created_at").eq("split_party_type", "driver").eq("wallet_account_id", walletId).order("created_at", { ascending: false }).limit(50);
  const { data: jobs } = await db.from("mobility_jobs").select("*").eq("rider_user_id", userId).in("status", ["accepted", "rider_arriving_pickup", "rider_arrived_pickup", "picked_up", "in_progress", "rider_arriving_dropoff"]).order("created_at", { ascending: false });
  const { count: completedCount } = await db.from("mobility_jobs").select("id", { count: "exact", head: true }).eq("rider_user_id", userId).eq("status", "completed");
  const { count: cancelledCount } = await db.from("mobility_jobs").select("id", { count: "exact", head: true }).eq("rider_user_id", userId).eq("status", "cancelled");
  return { wallet, allSplits: allSplits ?? [], jobs: jobs ?? [], completedCount: completedCount ?? 0, cancelledCount: cancelledCount ?? 0 };
}

// ── Realtime channel helpers (thin wrappers for decoupling) ──
export function createRealtimeChannel(name: string, opts?: any) {
  return supabase.channel(name, opts);
}

export function removeRealtimeChannel(channel: any) {
  return supabase.removeChannel(channel);
}
