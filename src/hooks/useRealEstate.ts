/**
 * useRealEstate — Core hook for the real-estate module.
 * Fetches properties, units, tenants, leases, rent payments, and documents.
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

export function usePropertyUnits(propertyId?: string) {
  return useQuery({
    queryKey: ["re-units", propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_units" as any)
        .select("*")
        .eq("property_id", propertyId!)
        .order("unit_number");
      if (error) throw error;
      return (data ?? []) as any[];
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

export function useRentPayments(leaseId?: string) {
  return useQuery({
    queryKey: ["re-rent-payments", leaseId],
    enabled: !!leaseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rent_payments" as any)
        .select("*")
        .eq("lease_id", leaseId!)
        .order("due_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
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
        .from("property_documents" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (propertyId) q = q.eq("property_id", propertyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}
