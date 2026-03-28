/**
 * useRentalPropertyDetail — Extracted from RentalManagement.tsx
 * Loads property-linked data: expenses, furniture, inventories, mode badges.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
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
    const [{ data: exp }, { data: fur }, { data: inv }] = await Promise.all([
      supabase.from("expenses").select("*").eq("org_id", orgId).eq("property_id", propertyId).order("expense_date", { ascending: false }),
      supabase.from("furniture_items").select("*").eq("org_id", orgId).eq("property_id", propertyId),
      supabase.from("inventory_reports").select("*").eq("org_id", orgId).eq("property_id", propertyId).order("report_date", { ascending: false }),
    ]);
    setExpenses(exp || []);
    setFurniture(fur || []);
    setInventories(inv || []);
  }, [orgId]);

  const loadModeBadges = useCallback(async () => {
    if (!orgId) return;
    const [{ data: seasonal }, { data: realEstate }] = await Promise.all([
      supabase.from("public_listings").select("property_id").eq("org_id", orgId).eq("active", true),
      supabase.from("real_estate_listings").select("property_id, listing_type").eq("org_id", orgId).eq("status", "active"),
    ]);
    setSeasonalPropertyIds(new Set((seasonal || []).map((s: any) => s.property_id).filter(Boolean)));
    setSalePropertyIds(new Set(
      (realEstate || []).filter((r: any) => r.listing_type === "sale").map((r: any) => r.property_id).filter(Boolean)
    ));
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
