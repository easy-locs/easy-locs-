/**
 * riderDispatchStore — Rider-only dispatch state.
 * Riders can: go online/offline, receive offers, accept/reject offers.
 * Riders CANNOT: create customer rides.
 */
import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

export interface RiderOffer {
  id: string;
  job_id: string;
  rider_user_id: string;
  status: string;
  distance_km: number | null;
  eta_minutes: number | null;
  score: number | null;
  offered_at: string | null;
  responded_at: string | null;
  // Joined job data
  job?: {
    id: string;
    customer_user_id: string;
    pickup_address: string;
    pickup_lat: number | null;
    pickup_lng: number | null;
    dropoff_address: string;
    dropoff_lat: number | null;
    dropoff_lng: number | null;
    fare_amount: number | null;
    delivery_fee: number | null;
    status: string;
    surge_multiplier: number | null;
  };
}

export interface RiderPresenceState {
  isOnline: boolean;
  isAvailable: boolean;
  currentLat: number | null;
  currentLng: number | null;
  vehicleType: string;
}

interface RiderDispatchState {
  presence: RiderPresenceState;
  offers: RiderOffer[];
  activeJobId: string | null;
  loading: boolean;

  hydratePresence: () => Promise<void>;
  toggleOnline: () => Promise<void>;
  updateLocation: (lat: number, lng: number, heading?: number, speed?: number) => Promise<void>;
  hydrateOffers: () => Promise<void>;
  acceptOffer: (offerId: string) => Promise<void>;
  rejectOffer: (offerId: string) => Promise<void>;
  advanceJobStatus: (jobId: string, nextStatus: string) => Promise<void>;
}

export const useRiderDispatchStore = create<RiderDispatchState>((set, get) => ({
  presence: { isOnline: false, isAvailable: true, currentLat: null, currentLng: null, vehicleType: "scooter" },
  offers: [],
  activeJobId: null,
  loading: false,

  hydratePresence: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await (supabase as any)
      .from("rider_presence")
      .select("*")
      .eq("rider_user_id", user.id)
      .maybeSingle();

    if (data) {
      set({
        presence: {
          isOnline: data.is_online,
          isAvailable: data.is_available,
          currentLat: data.current_lat,
          currentLng: data.current_lng,
          vehicleType: data.vehicle_type ?? "scooter",
        },
      });
    }
  },

  toggleOnline: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const newOnline = !get().presence.isOnline;

    await (supabase as any).from("rider_presence").upsert({
      rider_user_id: user.id,
      is_online: newOnline,
      is_available: newOnline,
      updated_at: new Date().toISOString(),
    });

    set(s => ({ presence: { ...s.presence, isOnline: newOnline, isAvailable: newOnline } }));
  },

  updateLocation: async (lat, lng, heading, speed) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await (supabase as any).from("rider_presence").upsert({
      rider_user_id: user.id,
      current_lat: lat,
      current_lng: lng,
      heading: heading ?? null,
      speed_kmh: speed ?? null,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    set(s => ({ presence: { ...s.presence, currentLat: lat, currentLng: lng } }));
  },

  hydrateOffers: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    set({ loading: true });

    const { data } = await (supabase as any)
      .from("delivery_job_offers")
      .select("*, job:delivery_jobs(*)")
      .eq("rider_user_id", user.id)
      .in("status", ["pending"])
      .order("offered_at", { ascending: false });

    set({ offers: (data ?? []) as RiderOffer[], loading: false });

    // Also check if rider has an active job
    const { data: activeJobs } = await (supabase as any)
      .from("delivery_jobs")
      .select("id")
      .eq("driver_id", user.id)
      .in("status", ["accepted", "in_progress", "assigned"])
      .limit(1);

    if (activeJobs?.[0]) {
      set({ activeJobId: activeJobs[0].id });
    }
  },

  acceptOffer: async (offerId) => {
    const { data, error } = await supabase.functions.invoke("dispatch-ride", {
      body: { action: "accept_offer", offer_id: offerId },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);

    set(s => ({
      offers: s.offers.filter(o => o.id !== offerId),
      activeJobId: data.job_id,
    }));
  },

  rejectOffer: async (offerId) => {
    const { data, error } = await supabase.functions.invoke("dispatch-ride", {
      body: { action: "reject_offer", offer_id: offerId },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);

    set(s => ({ offers: s.offers.filter(o => o.id !== offerId) }));
  },

  advanceJobStatus: async (jobId, nextStatus) => {
    const { data, error } = await supabase.functions.invoke("dispatch-ride", {
      body: { action: "advance_status", job_id: jobId, status: nextStatus },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);

    if (["completed", "cancelled"].includes(nextStatus)) {
      set({ activeJobId: null });
    }
  },
}));
