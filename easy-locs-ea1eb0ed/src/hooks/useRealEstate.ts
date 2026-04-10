/**
 * useRealEstate — Core hook for the real-estate module.
 * MIGRATED: All DB ops via real-estate.repository.
 */
import { useQuery } from "@tanstack/react-query";
import * as reRepo from "@/repositories/real-estate.repository";
import { useAuth } from "@/contexts/AuthContext";

export function useProperties(search?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["re-properties", user?.id, search],
    enabled: !!user,
    queryFn: () => reRepo.fetchPropertiesByUser(user!.id, search),
  });
}

export function usePropertyById(propertyId?: string) {
  return useQuery({
    queryKey: ["re-property-detail", propertyId],
    enabled: !!propertyId,
    queryFn: () => reRepo.fetchPropertyById(propertyId!),
  });
}

export function usePropertyUnits(propertyId?: string) {
  return useQuery({
    queryKey: ["re-units", propertyId],
    enabled: !!propertyId,
    queryFn: () => reRepo.fetchPropertyUnits(propertyId!),
  });
}

export function useTenants(search?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["re-tenants", user?.id, search],
    enabled: !!user,
    queryFn: () => reRepo.fetchTenantsByUser(user!.id, search),
  });
}

export function useLeases(search?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["re-leases", user?.id, search],
    enabled: !!user,
    queryFn: () => reRepo.fetchLeasesByUser(user!.id, search),
  });
}

export function useLeaseById(leaseId?: string) {
  return useQuery({
    queryKey: ["re-lease-detail", leaseId],
    enabled: !!leaseId,
    queryFn: () => reRepo.fetchLeaseById(leaseId!),
  });
}

export function useRentPayments(leaseId?: string) {
  return useQuery({
    queryKey: ["re-rent-payments", leaseId],
    enabled: !!leaseId,
    queryFn: () => reRepo.fetchRentPayments(leaseId!),
  });
}

export function usePropertyDocuments(propertyId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["re-docs", propertyId, user?.id],
    enabled: !!user,
    queryFn: () => reRepo.fetchPropertyDocuments(user!.id, propertyId),
  });
}

export function useRealEstateStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["re-stats", user?.id],
    enabled: !!user,
    queryFn: () => reRepo.fetchRealEstateStats(user!.id),
  });
}
