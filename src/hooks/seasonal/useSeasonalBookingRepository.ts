/**
 * useSeasonalBookingRepository — Atomic: CRUD for seasonal bookings.
 * Delegates to seasonal.repository.ts (single source of truth).
 */
import { useState, useCallback, useEffect } from "react";
import * as seasonalRepo from "@/repositories/seasonal.repository";

export interface SeasonalBooking {
  id: string; property_id: string; guest_name: string; guest_email: string;
  guest_phone: string; check_in: string; check_out: string;
  total_price: number; cleaning_fee: number; deposit_amount: number;
  status: string; notes: string;
}

export function useSeasonalBookingRepository(orgId: string | null) {
  const [bookings, setBookings] = useState<SeasonalBooking[]>([]);
  const [properties, setProperties] = useState<{ id: string; label: string; photo_urls?: any }[]>([]);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoadError(null);
    try {
      const [b, p, reqs] = await Promise.all([
        seasonalRepo.fetchSeasonalBookings(orgId),
        seasonalRepo.fetchPropertiesForSeasonal(orgId),
        seasonalRepo.fetchBookingRequests(orgId),
      ]);
      const seasonalBookings = (b || []) as SeasonalBooking[];
      const paidRequests = (reqs || []).filter((r: any) => r.status === "paid" || r.status === "approved");
      const existingKeys = new Set(seasonalBookings.map((sb) => `${sb.property_id}-${sb.check_in}-${sb.check_out}-${sb.guest_name}`));
      const missingBookings: SeasonalBooking[] = paidRequests
        .filter((r: any) => !existingKeys.has(`${r.property_id}-${r.check_in}-${r.check_out}-${r.guest_name}`))
        .map((r: any) => ({
          id: r.id, property_id: r.property_id, guest_name: r.guest_name, guest_email: r.guest_email || "",
          guest_phone: r.guest_phone || "", check_in: r.check_in, check_out: r.check_out,
          total_price: 0, cleaning_fee: 0, deposit_amount: 0, status: "confirmed", notes: `Via booking request (${r.status})`,
        }));
      setBookings([...seasonalBookings, ...missingBookings]);
      if (p) setProperties(p as any);
      if (reqs) setAllRequests(reqs);
    } catch (err: any) {
      console.error("[SeasonalBookingRepo] load error:", err);
      setLoadError(err.message || "Failed to load data");
    } finally { setLoading(false); }
  }, [orgId]);

  const save = useCallback(async (record: any, editingId: string | null) => {
    await seasonalRepo.saveSeasonalBooking(record, editingId);
  }, []);

  const remove = useCallback(async (id: string) => {
    await seasonalRepo.deleteSeasonalBooking(id);
  }, []);

  useEffect(() => {
    if (!orgId) return;
    return seasonalRepo.subscribeToBookingRequests(orgId, () => load());
  }, [orgId, load]);

  useEffect(() => { load(); }, [load]);

  return { bookings, properties, allRequests, loading, loadError, load, save, remove };
}
