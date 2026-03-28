/**
 * useRentalPropertyLoader — Extracted property detail + mode badges loading.
 * Replaces inline supabase calls in RentalManagement.tsx.
 */
import { useState, useEffect, useCallback } from "react";
import { fetchPropertyDetail, fetchPropertyModeBadges } from "@/lib/rental/rental-repository";

export function useRentalPropertyLoader(orgId: string | null) {
  const [propertyExpenses, setPropertyExpenses] = useState<any[]>([]);
  const [propertyFurniture, setPropertyFurniture] = useState<any[]>([]);
  const [propertyInventories, setPropertyInventories] = useState<any[]>([]);
  const [seasonalPropertyIds, setSeasonalPropertyIds] = useState<Set<string>>(new Set());
  const [salePropertyIds, setSalePropertyIds] = useState<Set<string>>(new Set());

  const loadPropertyDetail = useCallback(async (propertyId: string) => {
    if (!orgId) return;
    const result = await fetchPropertyDetail(orgId, propertyId);
    setPropertyExpenses(result.expenses);
    setPropertyFurniture(result.furniture);
    setPropertyInventories(result.inventories);
  }, [orgId]);

  const loadModeBadges = useCallback(async () => {
    if (!orgId) return;
    const badges = await fetchPropertyModeBadges(orgId);
    setSeasonalPropertyIds(badges.seasonalIds);
    setSalePropertyIds(badges.saleIds);
  }, [orgId]);

  useEffect(() => {
    loadModeBadges();
  }, [loadModeBadges]);

  return {
    propertyExpenses,
    propertyFurniture,
    propertyInventories,
    seasonalPropertyIds,
    salePropertyIds,
    loadPropertyDetail,
    loadModeBadges,
  };
}
