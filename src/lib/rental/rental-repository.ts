/**
 * rental-repository — All rental domain DB reads/writes.
 * Single source for properties, tenants, leases, rent calls.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchProperties(orgId: string) {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createProperty(orgId: string, userId: string, form: Record<string, any>) {
  const { data, error } = await supabase
    .from("properties")
    .insert({ ...form, org_id: orgId, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProperty(id: string, updates: Record<string, any>) {
  const { error } = await supabase.from("properties").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteProperty(id: string) {
  const { error } = await supabase.from("properties").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchTenants(orgId: string) {
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createTenant(orgId: string, userId: string, form: Record<string, any>) {
  const { data, error } = await supabase
    .from("tenants")
    .insert({ ...form, org_id: orgId, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTenant(id: string, updates: Record<string, any>) {
  const { error } = await supabase.from("tenants").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteTenant(id: string) {
  const { error } = await supabase.from("tenants").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchRentCalls(orgId: string) {
  const { data, error } = await supabase
    .from("rent_calls")
    .select("*")
    .eq("org_id", orgId)
    .order("due_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createRentCall(orgId: string, call: Record<string, any>) {
  const { data, error } = await supabase
    .from("rent_calls")
    .insert({ ...call, org_id: orgId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRentCall(id: string, updates: Record<string, any>) {
  const { error } = await supabase.from("rent_calls").update(updates).eq("id", id);
  if (error) throw error;
}

export async function fetchLeases(orgId: string) {
  const { data, error } = await supabase
    .from("leases")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
