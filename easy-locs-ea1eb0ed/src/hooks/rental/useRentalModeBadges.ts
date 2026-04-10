/**
 * useRentalModeBadges — Atomic: loads seasonal/sale listing badges per property.
 */
import { useState, useEffect } from "react";
import * as rentalRepo from "@/repositories/rental-data.repository";

export function useRentalModeBadges(orgId: string | null, propertyCount: number) {
  const [seasonalIds, setSeasonalIds] = useState<Set<string>>(new Set());
  const [saleIds, setSaleIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!orgId) return;
    rentalRepo.fetchModeBadges(orgId).then(badges => {
      setSeasonalIds(badges.seasonalIds);
      setSaleIds(badges.saleIds);
    });
  }, [orgId, propertyCount]);

  return { seasonalIds, saleIds };
}
