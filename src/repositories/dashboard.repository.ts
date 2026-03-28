/**
 * dashboard.repository — All DB operations for dashboard pages (Buildings, Tasks, Interventions, etc.)
 */
import { supabase } from "@/integrations/supabase/client";

// ── Org resolution ──
export async function fetchUserOrg(userId: string) {
  const { data } = await supabase.from("org_members").select("org_id").eq("user_id", userId).limit(1).single();
  if (!data) return null;
  const { data: o } = await supabase.from("orgs").select("*").eq("id", data.org_id).single();
  return o;
}

export async function fetchOrgMembers(orgId: string) {
  const { data } = await supabase.from("org_members").select("id, user_id, role, created_at").eq("org_id", orgId);
  if (!data) return [];
  return Promise.all(data.map(async (m) => {
    const { data: p } = await supabase.from("profiles").select("email, name").eq("id", m.user_id).single();
    return { ...m, email: p?.email || "", name: p?.name || "" };
  }));
}

// ── Buildings ──
export async function fetchBuildings(orgId: string) {
  const { data } = await supabase.from("buildings").select("*").eq("org_id", orgId).order("name");
  return data || [];
}

export async function upsertBuilding(record: Record<string, any>, editId?: string) {
  if (editId) {
    const { error } = await (supabase as any).from("buildings").update(record).eq("id", editId);
    if (error) throw error;
  } else {
    const { error } = await (supabase as any).from("buildings").insert(record);
    if (error) throw error;
  }
}

export async function deleteBuilding(id: string) {
  const { error } = await supabase.from("buildings").delete().eq("id", id);
  if (error) throw error;
}

// ── Tasks ──
export async function fetchTasksData(orgId: string) {
  const [tasksRes, propsRes, tenantsRes] = await Promise.all([
    supabase.from("tasks").select("*").eq("org_id", orgId).order("due_date", { ascending: true }),
    supabase.from("properties").select("id, label").eq("org_id", orgId),
    supabase.from("tenants").select("id, name").eq("org_id", orgId),
  ]);
  return { tasks: tasksRes.data || [], properties: propsRes.data || [], tenants: tenantsRes.data || [] };
}

export async function upsertTask(record: Record<string, any>, editId?: string) {
  if (editId) {
    const { error } = await (supabase as any).from("tasks").update(record).eq("id", editId);
    if (error) throw error;
  } else {
    const { error } = await (supabase as any).from("tasks").insert(record);
    if (error) throw error;
  }
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

export async function updateTaskStatus(id: string, status: string) {
  await supabase.from("tasks").update({ status }).eq("id", id);
}

// ── Interventions ──
export async function fetchInterventionsData(orgId: string, countryFilter?: string) {
  let propQuery = supabase.from("properties").select("id, label, country").eq("org_id", orgId).order("label");
  if (countryFilter) propQuery = propQuery.eq("country", countryFilter);
  const { data: propData } = await propQuery;
  const props = propData || [];
  const propIds = props.map(p => p.id);

  let intQuery = supabase.from("interventions").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
  if (countryFilter && propIds.length > 0) intQuery = intQuery.in("property_id", propIds);
  else if (countryFilter) return { interventions: [], properties: props, tenants: [] };
  const { data: intData } = await intQuery;

  const { data: tenData } = await supabase.from("tenants").select("id, name, property_id").eq("org_id", orgId).order("name");
  let tenants = tenData || [];
  if (countryFilter) {
    const propIdSet = new Set(propIds);
    tenants = tenants.filter(t => t.property_id && propIdSet.has(t.property_id));
  }

  return { interventions: intData || [], properties: props, tenants };
}

export async function upsertIntervention(record: Record<string, any>, editId?: string) {
  if (editId) {
    const { data, error } = await (supabase as any).from("interventions").update(record).eq("id", editId).select().single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await (supabase as any).from("interventions").insert(record).select().single();
    if (error) throw error;
    return data;
  }
}

export async function deleteIntervention(id: string) {
  const { error } = await supabase.from("interventions").delete().eq("id", id);
  if (error) throw error;
}

export function subscribeInterventions(orgId: string, onUpdate: () => void) {
  const channel = supabase
    .channel("interventions-rt")
    .on("postgres_changes", { event: "*", schema: "public", table: "interventions", filter: `org_id=eq.${orgId}` }, onUpdate)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// ── Vault ──
export async function fetchVaultFiles(orgId: string) {
  const { data } = await supabase.from("vault_files").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
  return data || [];
}

export async function uploadVaultFile(orgId: string, userId: string, file: File) {
  const path = `${orgId}/${Date.now()}_${file.name}`;
  const { error } = await supabase.storage.from("vault").upload(path, file);
  if (error) throw error;
  await supabase.from("vault_files").insert({ org_id: orgId, user_id: userId, filename: file.name, file_url: path, size: file.size });
}

export async function downloadVaultFile(fileUrl: string) {
  const { data, error } = await supabase.storage.from("vault").download(fileUrl);
  if (error || !data) throw error || new Error("Download failed");
  return data;
}

export async function deleteVaultFile(id: string, fileUrl: string) {
  await supabase.storage.from("vault").remove([fileUrl]);
  const { error } = await supabase.from("vault_files").delete().eq("id", id);
  if (error) throw error;
}

// ── Collaboration ──
export async function fetchCollabInvitations(orgId: string) {
  const { data } = await (supabase as any)
    .from("collaboration_invitations")
    .select("*").eq("org_id", orgId)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function insertCollabInvitation(record: Record<string, any>) {
  const { error } = await (supabase as any).from("collaboration_invitations").insert(record);
  if (error) throw error;
}

export async function deleteCollabInvitation(id: string) {
  const { error } = await (supabase as any).from("collaboration_invitations").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteOrgMember(memberId: string) {
  const { error } = await supabase.from("org_members").delete().eq("id", memberId);
  if (error) throw error;
}

export async function updateOrgMemberRole(memberId: string, role: string) {
  const { error } = await supabase.from("org_members").update({ role } as any).eq("id", memberId);
  if (error) throw error;
}

// ── Candidates ──
export async function fetchCandidatesData(orgId: string) {
  const [{ data: c }, { data: p }] = await Promise.all([
    supabase.from("candidates").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
    supabase.from("properties").select("id, label").eq("org_id", orgId).order("label"),
  ]);
  return { candidates: c || [], properties: p || [] };
}

export async function insertCandidate(record: Record<string, any>) {
  const { error } = await (supabase as any).from("candidates").insert(record);
  if (error) throw error;
}

export async function updateCandidateStatus(id: string, status: string) {
  await supabase.from("candidates").update({ status }).eq("id", id);
}

export async function deleteCandidate(id: string) {
  await supabase.from("candidates").delete().eq("id", id);
}

// ── LocalServices ──
export async function fetchLocalServicesData(orgId: string) {
  const [{ data: svc }, { data: props }, { data: org }] = await Promise.all([
    supabase.from("local_services").select("*").eq("org_id", orgId).order("sort_order"),
    supabase.from("properties").select("id, label, city, country").eq("org_id", orgId).order("label"),
    supabase.from("orgs").select("local_services_enabled").eq("id", orgId).single(),
  ]);
  return { services: svc || [], properties: props || [], featureEnabled: org?.local_services_enabled || false };
}

export async function toggleLocalServicesFeature(orgId: string, enabled: boolean) {
  await supabase.from("orgs").update({ local_services_enabled: enabled } as any).eq("id", orgId);
}

export async function upsertLocalService(record: Record<string, any>, editId?: string) {
  if (editId) await (supabase as any).from("local_services").update(record).eq("id", editId);
  else await (supabase as any).from("local_services").insert(record);
}

export async function deleteLocalService(id: string) {
  await supabase.from("local_services").delete().eq("id", id);
}

// ── Country Workspace ──
export async function fetchCountryWorkspaceStats(orgId: string, country: string) {
  const [props, tenants, docs, buildings, inventories, furniture] = await Promise.all([
    supabase.from("properties").select("id", { count: "exact" }).eq("org_id", orgId).eq("country", country),
    supabase.from("tenants").select("id, property_id, lease_start").eq("org_id", orgId),
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("country", country),
    supabase.from("buildings").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    supabase.from("inventory_reports").select("id, property_id").eq("org_id", orgId),
    supabase.from("furniture_items").select("id, property_id").eq("org_id", orgId),
  ]);
  const propIds = new Set((props.data || []).map(p => p.id));
  const countryTenants = (tenants.data || []).filter(t => t.property_id && propIds.has(t.property_id));
  const countryLeases = countryTenants.filter(t => t.lease_start);
  const countryInventories = (inventories.data || []).filter(i => i.property_id && propIds.has(i.property_id));
  const countryFurniture = (furniture.data || []).filter(f => f.property_id && propIds.has(f.property_id));
  return {
    properties: props.count || 0,
    tenants: countryTenants.length,
    leases: countryLeases.length,
    documents: docs.count || 0,
    buildings: buildings.count || 0,
    inventories: countryInventories.length,
    furniture: countryFurniture.length,
  };
}

// ── Concierge Operations ──
export async function fetchConciergeOpsData(orgId: string) {
  const [{ data: props }, { data: seasonal }, { data: requests }, { data: orders }, { data: services }, { data: tasks }] = await Promise.all([
    supabase.from("properties").select("id, label, city, country").eq("org_id", orgId),
    (supabase as any).from("seasonal_bookings").select("*").eq("org_id", orgId),
    supabase.from("booking_requests").select("*").eq("org_id", orgId).in("status", ["confirmed", "paid", "approved"]) as any,
    supabase.from("concierge_orders").select("*").eq("org_id", orgId),
    supabase.from("concierge_services").select("*").eq("org_id", orgId),
    supabase.from("booking_tasks").select("*").eq("org_id", orgId),
  ]);
  // Deduplicate bookings
  const merged: any[] = [];
  const seen = new Set<string>();
  for (const b of [...(seasonal || []), ...(requests || [])] as any[]) {
    const key = `${b.property_id}-${b.check_in}-${b.check_out}-${b.guest_name}`;
    if (!seen.has(key)) { seen.add(key); merged.push(b); }
  }
  return { properties: props || [], bookings: merged, orders: orders || [], services: services || [], tasks: tasks || [] };
}

// ── Receipts page ──
export async function fetchReceiptDocs(orgId: string, countryFilter?: string) {
  let query = supabase.from("documents").select("id, title, doc_type, data_json, created_at")
    .eq("org_id", orgId).eq("doc_type", "rent-receipt");
  if (countryFilter) query = query.eq("country", countryFilter);
  const { data } = await query.order("created_at", { ascending: false });
  return data || [];
}

export async function fetchReceiptOwnerInfo(userId: string, orgId: string) {
  const [profileRes, orgRes, ownerRes] = await Promise.all([
    supabase.from("profiles").select("signature_url, name").eq("id", userId).single(),
    supabase.from("orgs").select("stamp_url").eq("id", orgId).single(),
    supabase.from("owner_profiles").select("full_name, address, postal_code, city").eq("org_id", orgId).limit(1).single(),
  ]);
  return {
    signatureUrl: profileRes.data?.signature_url ?? null,
    profileName: profileRes.data?.name ?? null,
    stampUrl: (orgRes.data as any)?.stamp_url ?? null,
    ownerName: ownerRes.data?.full_name ?? null,
    ownerAddress: ownerRes.data ? [ownerRes.data.address, ownerRes.data.postal_code, ownerRes.data.city].filter(Boolean).join(", ") : null,
  };
}

// ── TrackRide ──
export async function fetchMobilityJob(jobId: string) {
  const { data } = await (supabase as any).from("mobility_jobs").select("*").eq("id", jobId).single();
  return data;
}

export async function fetchRiderProfile(riderId: string) {
  const { data } = await (supabase as any).from("rider_profiles")
    .select("id,display_name,vehicle_type,vehicle_plate,vehicle_model,rating,photo_url,phone")
    .eq("user_id", riderId).maybeSingle();
  return data;
}

export async function fetchRideConversation(riderUserId: string, customerUserId: string) {
  const { data } = await (supabase as any).from("conversations_v2").select("id")
    .eq("type", "ride").limit(1).maybeSingle();
  return data?.id ?? null;
}

export async function cancelMobilityJob(jobId: string) {
  const { error } = await (supabase as any).from("mobility_jobs").update({ status: "cancelled" }).eq("id", jobId);
  if (error) throw error;
}

export function subscribeMobilityJob(jobId: string, onUpdate: (data: any) => void) {
  const ch = supabase
    .channel(`track-job-${jobId}`)
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "mobility_jobs", filter: `id=eq.${jobId}` }, (payload) => onUpdate(payload.new))
    .subscribe();
  return { unsubscribe: () => supabase.removeChannel(ch), channel: ch };
}

// ── Onboarding ──
export async function fetchOnboardingProgress(userId: string) {
  const { data } = await supabase.from("profiles").select("onboarding_step, country, user_type").eq("id", userId).single();
  return data;
}

export async function updateProfile(userId: string, updates: Record<string, any>) {
  await supabase.from("profiles").update(updates as any).eq("id", userId);
}

export async function fetchUserOrgId(userId: string) {
  const { data } = await supabase.from("org_members").select("org_id").eq("user_id", userId).limit(1).maybeSingle();
  return data?.org_id ?? null;
}

export async function createOrg(orgId: string, userId: string) {
  await supabase.from("orgs").insert({ id: orgId, owner_user_id: userId, name: "Mon organisation" });
  await supabase.from("org_members").insert({ org_id: orgId, user_id: userId, role: "owner" });
  await supabase.from("subscriptions").insert({ user_id: userId, plan: "trial", status: "trialing", trial_ends_at: new Date(Date.now() + 3 * 86400000).toISOString() });
}

export async function insertOwnerProfile(record: Record<string, any>) {
  const { error } = await (supabase as any).from("owner_profiles").insert(record);
  if (error) throw error;
}

export async function insertProperty(record: Record<string, any>) {
  const { data, error } = await (supabase as any).from("properties").insert(record).select("id").single();
  if (error) throw error;
  return data?.id;
}

export async function insertTenant(record: Record<string, any>) {
  const { error } = await (supabase as any).from("tenants").insert(record);
  if (error) throw error;
}

export async function upsertOtaConnection(record: Record<string, any>) {
  await supabase.from("ota_connections").upsert(record, { onConflict: "id" });
}

export async function invokeSyncIcal(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("sync-ical", { body });
  if (error) throw error;
  return data;
}
