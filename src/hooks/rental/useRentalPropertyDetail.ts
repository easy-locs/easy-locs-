/**
 * useRentalPropertyDetail — Atomic: loads property expenses, furniture, inventories.
 */
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useRentalPropertyDetail(orgId: string | null) {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [furniture, setFurniture] = useState<any[]>([]);
  const [inventories, setInventories] = useState<any[]>([]);

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

  return { expenses, furniture, inventories, loadDetail };
}
