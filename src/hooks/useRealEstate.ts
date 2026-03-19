/**
 * useRealEstate — Core hook for the real-estate module.
 * All queries verified against actual DB schema (properties, tenants, leases,
 * property_units, rent_payments, property_documents).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useProperties(search?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["re-properties", user?.id, search],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase
        .from("properties")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (search) q = q.or(`label.ilike.%${search}%,address.ilike.%${search}%,city.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePropertyById(propertyId?: string) {
  return useQuery({
    queryKey: ["re-property-detail", propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", propertyId!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function usePropertyUnits(propertyId?: string) {
  return useQuery({
    queryKey: ["re-units", propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_units")
        .select("*")
        .eq("property_id", propertyId!)
        .order("unit_number");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTenants(search?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["re-tenants", user?.id, search],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase
        .from("tenants")
        .select("*, properties:property_id(label, city, country)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (search) q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useLeases(search?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["re-leases", user?.id, search],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase
        .from("leases")
        .select("*, tenants:tenant_id(name, email), properties:property_id(label, city, country)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (search) q = q.ilike("status", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useLeaseById(leaseId?: string) {
  return useQuery({
    queryKey: ["re-lease-detail", leaseId],
    enabled: !!leaseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leases")
        .select("*, tenants:tenant_id(name, email, phone), properties:property_id(label, city, country, address)")
        .eq("id", leaseId!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useRentPayments(leaseId?: string) {
  return useQuery({
    queryKey: ["re-rent-payments", leaseId],
    enabled: !!leaseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rent_payments")
        .select("*")
        .eq("lease_id", leaseId!)
        .order("due_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePropertyDocuments(propertyId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["re-docs", propertyId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase
        .from("property_documents")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (propertyId) q = q.eq("property_id", propertyId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Real-estate stats for dashboard widgets */
export function useRealEstateStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["re-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [props, tenants, leases, payments] = await Promise.all([
        supabase.from("properties").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("tenants").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("leases").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("rent_payments").select("id, status", { count: "exact" }).eq("status", "overdue"),
      ]);
      return {
        propertiesCount: props.count ?? 0,
        tenantsCount: tenants.count ?? 0,
        leasesCount: leases.count ?? 0,
        overduePayments: payments.count ?? 0,
      };
    },
  });
}
