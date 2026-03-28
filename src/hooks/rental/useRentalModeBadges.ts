/**
 * useRentalModeBadges — Atomic: loads seasonal/sale listing badges per property.
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useRentalModeBadges(orgId: string | null, propertyCount: number) {
  const [seasonalIds, setSeasonalIds] = useState<Set<string>>(new Set());
  const [saleIds, setSaleIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      const [{ data: seasonal }, { data: realEstate }] = await Promise.all([
        supabase.from("public_listings").select("property_id").eq("org_id", orgId).eq("active", true),
        supabase.from("real_estate_listings").select("property_id, listing_type").eq("org_id", orgId).eq("status", "active"),
      ]);
      setSeasonalIds(new Set((seasonal || []).map((s: any) => s.property_id).filter(Boolean)));
      setSaleIds(new Set(
        (realEstate || []).filter((r: any) => r.listing_type === "sale").map((r: any) => r.property_id).filter(Boolean)
      ));
    })();
  }, [orgId, propertyCount]);

  return { seasonalIds, saleIds };
}
