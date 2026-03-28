/**
 * useSeasonalBookingRepository — Atomic: CRUD for seasonal bookings.
 */
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SeasonalBooking {
  id: string;
  property_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  check_in: string;
  check_out: string;
  total_price: number;
  cleaning_fee: number;
  deposit_amount: number;
  status: string;
  notes: string;
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
      const [{ data: b, error: bErr }, { data: p }, { data: reqs }] = await Promise.all([
        supabase.from("seasonal_bookings").select("*").eq("org_id", orgId).order("check_in"),
        supabase.from("properties").select("id, label, photo_urls").eq("org_id", orgId).order("label"),
        supabase.from("booking_requests").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(50),
      ]);
      if (bErr) throw bErr;
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
      if (p) setProperties(p);
      if (reqs) setAllRequests(reqs);
    } catch (err: any) {
      console.error("[SeasonalBookingRepo] load error:", err);
      setLoadError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  const save = useCallback(async (record: any, editingId: string | null) => {
    if (editingId) {
      const { error } = await supabase.from("seasonal_bookings").update(record).eq("id", editingId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("seasonal_bookings").insert({ ...record, status: "confirmed" });
      if (error) throw error;
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    await supabase.from("seasonal_bookings").delete().eq("id", id);
  }, []);

  // Realtime
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel("seasonal-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "booking_requests", filter: `org_id=eq.${orgId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, load]);

  useEffect(() => { load(); }, [load]);

  return { bookings, properties, allRequests, loading, loadError, load, save, remove };
}
