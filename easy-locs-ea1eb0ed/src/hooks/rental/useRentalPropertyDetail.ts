/**
 * useRentalPropertyDetail — Extracted from RentalManagement.tsx
 * Loads property-linked data: expenses, furniture, inventories, mode badges.
 */
import { useState, useEffect, useCallback } from "react";
import * as rentalRepo from "@/repositories/rental-data.repository";
import { useAuth } from "@/contexts/AuthContext";

export function useRentalPropertyDetail() {
  const { orgId } = useAuth();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [furniture, setFurniture] = useState<any[]>([]);
  const [inventories, setInventories] = useState<any[]>([]);
  const [seasonalPropertyIds, setSeasonalPropertyIds] = useState<Set<string>>(new Set());
  const [salePropertyIds, setSalePropertyIds] = useState<Set<string>>(new Set());

  const loadDetail = useCallback(async (propertyId: string) => {
    if (!orgId) return;
    const detail = await rentalRepo.fetchPropertyDetail(orgId, propertyId);
    setExpenses(detail.expenses);
    setFurniture(detail.furniture);
    setInventories(detail.inventories);
  }, [orgId]);

  const loadModeBadges = useCallback(async () => {
    if (!orgId) return;
    const badges = await rentalRepo.fetchModeBadges(orgId);
    setSeasonalPropertyIds(badges.seasonalIds);
    setSalePropertyIds(badges.saleIds);
  }, [orgId]);

  // Aliases for backward compat
  const propertyExpenses = expenses;
  const propertyFurniture = furniture;
  const propertyInventories = inventories;

  return {
    expenses, furniture, inventories,
    propertyExpenses, propertyFurniture, propertyInventories,
    seasonalPropertyIds, salePropertyIds,
    loadDetail, loadPropertyDetail: loadDetail, loadModeBadges,
  };
}
