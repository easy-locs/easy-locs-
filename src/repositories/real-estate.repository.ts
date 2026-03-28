/**
 * real-estate.repository — DB ops for the real-estate module hooks.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchPropertiesByUser(userId: string, search?: string) {
  let q = supabase.from("properties").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (search) q = q.or(`label.ilike.%${search}%,address.ilike.%${search}%,city.ilike.%${search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function fetchPropertyById(propertyId: string) {
  const { data, error } = await supabase.from("properties").select("*").eq("id", propertyId).single();
  if (error) throw error;
  return data;
}

export async function fetchPropertyUnits(propertyId: string) {
  const { data, error } = await supabase.from("property_units").select("*").eq("property_id", propertyId).order("unit_number");
  if (error) throw error;
  return data ?? [];
}

export async function fetchTenantsByUser(userId: string, search?: string) {
  let q = supabase.from("tenants").select("*, properties:property_id(label, city, country)").eq("user_id", userId).order("created_at", { ascending: false });
  if (search) q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function fetchLeasesByUser(userId: string, search?: string) {
  let q = supabase.from("leases").select("*, tenants:tenant_id(name, email), properties:property_id(label, city, country)").eq("user_id", userId).order("created_at", { ascending: false });
  if (search) q = q.ilike("status", `%${search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function fetchLeaseById(leaseId: string) {
  const { data, error } = await supabase.from("leases").select("*, tenants:tenant_id(name, email, phone), properties:property_id(label, city, country, address)").eq("id", leaseId).single();
  if (error) throw error;
  return data;
}

export async function fetchRentPayments(leaseId: string) {
  const { data, error } = await supabase.from("rent_payments").select("*").eq("lease_id", leaseId).order("due_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchPropertyDocuments(userId: string, propertyId?: string) {
  let q = supabase.from("property_documents").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (propertyId) q = q.eq("property_id", propertyId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function fetchRealEstateStats(userId: string) {
  const [props, tenants, leases, payments] = await Promise.all([
    supabase.from("properties").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("tenants").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("leases").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("rent_payments").select("id, status", { count: "exact" }).eq("status", "overdue"),
  ]);
  return {
    propertiesCount: props.count ?? 0,
    tenantsCount: tenants.count ?? 0,
    leasesCount: leases.count ?? 0,
    overduePayments: payments.count ?? 0,
  };
}
