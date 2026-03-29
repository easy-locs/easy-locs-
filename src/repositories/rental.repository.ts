/**
 * rental.repository — All DB ops for rental hooks and components.
 */
import { supabase } from "@/integrations/supabase/client";

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

// ── Lease workflow edge function ──
export async function invokeLeaseWorkflow(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("lease-workflow", { body });
  if (error) throw error;
  return data;
}

// ── Send email edge function ──
export async function invokeSendEmail(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("send-email", { body });
  if (error) throw error;
  return data;
}

// ── Tenants & Properties for charges regularization ──
export async function fetchTenantsForCharges(orgId: string) {
  const { data } = await supabase.from("tenants").select("id, name, charges_amount, property_id").eq("org_id", orgId);
  return data || [];
}

export async function fetchPropertiesForCharges(orgId: string) {
  const { data } = await supabase.from("properties").select("id, label, monthly_charges, country").eq("org_id", orgId);
  return data || [];
}

// ── Fiscal report queries ──
export async function fetchPropertiesForFiscalReport(orgId: string, countryFilter?: string) {
  let q = supabase.from("properties").select("id, label, monthly_rent, monthly_charges, address, city, country").eq("org_id", orgId);
  if (countryFilter) q = q.eq("country", countryFilter);
  const { data } = await q;
  return data || [];
}

export async function fetchRentCallsForOrg(orgId: string) {
  const { data } = await supabase.from("rent_calls").select("month, rent_amount, charges_amount, total_amount, paid, property_id").eq("org_id", orgId);
  return data || [];
}

// ── Leases by org ──
export async function fetchLeasesByOrg(orgId: string) {
  const { data } = await supabase.from("leases").select("*").eq("org_id", orgId);
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

// ── Tenant user ID for notifications ──
export async function fetchTenantUserId(tenantId: string) {
  const { data } = await supabase.from("tenants").select("tenant_user_id").eq("id", tenantId).single();
  return data?.tenant_user_id || null;
}

// ── Referrals ──
export async function fetchReferralCode(userId: string) {
  const { data } = await supabase.from("profiles").select("referral_code").eq("id", userId).single();
  return data?.referral_code || "";
}

export async function fetchReferrals(userId: string) {
  const { data } = await supabase.from("referrals").select("*").eq("referrer_user_id", userId).order("created_at", { ascending: false });
  return data || [];
}

// ── Properties insert ──
export async function insertProperty(payload: Record<string, any>) {
  const { error } = await supabase.from("properties").insert(payload);
  if (error) throw error;
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

// ── App notifications ──
export async function insertNotification(payload: Record<string, any>) {
  await supabase.from("app_notifications").insert(payload as any);
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
