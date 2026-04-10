import { supabase } from "@/integrations/supabase/client";
import type {
  LeaseRecord,
  PropertyUnitManagement,
  RentPaymentRecord,
} from "@/lib/types/domain";

 
const db = supabase as any;

export const propertyManagementRepoExtended = {
  async listUnitsByOwner(ownerOrbitId: string): Promise<PropertyUnitManagement[]> {
    const { data, error } = await db
      .from("property_units")
      .select("*")
      .eq("ownerOrbitId", ownerOrbitId)
      .order("createdAt", { ascending: false });

    if (error) throw error;
    return (data ?? []) as PropertyUnitManagement[];
  },

  async listLeasesByOwner(ownerOrbitId: string): Promise<LeaseRecord[]> {
    const { data, error } = await db
      .from("leases")
      .select("*")
      .eq("ownerOrbitId", ownerOrbitId)
      .order("createdAt", { ascending: false });

    if (error) throw error;
    return (data ?? []) as LeaseRecord[];
  },

  async listLeasesByTenant(tenantOrbitId: string): Promise<LeaseRecord[]> {
    const { data, error } = await db
      .from("leases")
      .select("*")
      .eq("tenantOrbitId", tenantOrbitId)
      .order("createdAt", { ascending: false });

    if (error) throw error;
    return (data ?? []) as LeaseRecord[];
  },

  async listRentPaymentsByOwner(ownerOrbitId: string): Promise<RentPaymentRecord[]> {
    const { data, error } = await db
      .from("rent_payments")
      .select("*")
      .eq("ownerOrbitId", ownerOrbitId)
      .order("createdAt", { ascending: false });

    if (error) throw error;
    return (data ?? []) as RentPaymentRecord[];
  },

  async listRentPaymentsByTenant(tenantOrbitId: string): Promise<RentPaymentRecord[]> {
    const { data, error } = await db
      .from("rent_payments")
      .select("*")
      .eq("tenantOrbitId", tenantOrbitId)
      .order("createdAt", { ascending: false });

    if (error) throw error;
    return (data ?? []) as RentPaymentRecord[];
  },
};
