/**
 * riderDispatchStore — Rider-only dispatch state.
 * Reads/writes: mobility_jobs, mobility_job_offers, rider_presence, rider_profiles
 * Actor: RIDER only.
 * Riders can: go online/offline, receive offers, accept/reject, advance trip status.
 * Riders CANNOT: create customer jobs.
 */
import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

export interface MobilityOffer {
  id: string;
  job_id: string;
  rider_user_id: string;
  rider_profile_id: string | null;
  status: string;
  radius_km: number;
  fare_at_offer: number | null;
  surge_multiplier: number;
  distance_km: number | null;
  eta_minutes: number | null;
  offered_at: string | null;
  expires_at: string | null;
  // Joined job data
  job?: {
    id: string;
    job_type: string;
    service_level: string;
    customer_user_id: string;
    pickup_label: string | null;
    pickup_address: string | null;
    pickup_lat: number | null;
    pickup_lng: number | null;
    dropoff_label: string | null;
    dropoff_address: string | null;
    dropoff_lat: number | null;
    dropoff_lng: number | null;
    current_price: number | null;
    quoted_price: number | null;
    currency: string;
    status: string;
    surge_multiplier: number | null;
    merchant_status: string | null;
  };
}

export interface RiderPresenceState {
  profileId: string | null;
  isOnline: boolean;
  isAvailable: boolean;
  lat: number | null;
  lng: number | null;
  vehicleType: string;
  serviceModes: string[];
}

interface RiderDispatchState {
  presence: RiderPresenceState;
  offers: MobilityOffer[];
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
  presence: { profileId: null, isOnline: false, isAvailable: true, lat: null, lng: null, vehicleType: "car", serviceModes: [] },
  offers: [],
  activeJobId: null,
  loading: false,

  hydratePresence: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get rider profile first
    const { data: profile } = await supabase
      .from("rider_profiles")
      .select("id, vehicle_type, rider_mode, is_online, is_available")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) return;

    // Get presence
    const { data: pres } = await supabase
      .from("rider_presence")
      .select("*")
      .eq("rider_profile_id", profile.id)
      .maybeSingle();

    set({
      presence: {
        profileId: profile.id,
        isOnline: pres?.is_online ?? profile.is_online ?? false,
        isAvailable: pres?.is_available ?? profile.is_available ?? true,
        lat: pres?.lat ?? null,
        lng: pres?.lng ?? null,
        vehicleType: profile.vehicle_type ?? "car",
        serviceModes: pres?.service_modes ?? [],
      },
    });
  },

  toggleOnline: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { presence } = get();
    if (!presence.profileId) return;

    const newOnline = !presence.isOnline;
    const now = new Date().toISOString();

    await supabase.from("rider_presence").upsert({
      rider_profile_id: presence.profileId,
      user_id: user.id,
      is_online: newOnline,
      is_available: newOnline,
      vehicle_type: presence.vehicleType,
      service_modes: presence.serviceModes.length ? presence.serviceModes : ["taxi", "delivery"],
      last_seen_at: now,
      updated_at: now,
    });

    // Sync to rider_profiles
    await supabase.from("rider_profiles").update({
      is_online: newOnline, is_available: newOnline, updated_at: now,
    }).eq("id", presence.profileId);

    set(s => ({ presence: { ...s.presence, isOnline: newOnline, isAvailable: newOnline } }));
  },

  updateLocation: async (lat, lng, heading, speed) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { presence } = get();
    if (!presence.profileId) return;

    const now = new Date().toISOString();
    await supabase.from("rider_presence").upsert({
      rider_profile_id: presence.profileId,
      user_id: user.id,
      lat, lng,
      heading: heading ?? null,
      speed: speed ?? null,
      last_seen_at: now,
      updated_at: now,
      vehicle_type: presence.vehicleType,
      service_modes: presence.serviceModes.length ? presence.serviceModes : ["taxi", "delivery"],
    });

    set(s => ({ presence: { ...s.presence, lat, lng } }));
  },

  hydrateOffers: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    set({ loading: true });

    const { data } = await supabase
      .from("mobility_job_offers")
      .select("*, job:mobility_jobs(*)")
      .eq("rider_user_id", user.id)
      .in("status", ["pending"])
      .order("offered_at", { ascending: false });

    set({ offers: (data ?? []) as unknown as MobilityOffer[], loading: false });

    // Check for active job
    const { data: activeJobs } = await supabase
      .from("mobility_jobs")
      .select("id")
      .eq("rider_user_id", user.id)
      .in("status", ["accepted", "rider_arriving_pickup", "rider_arrived_pickup", "picked_up", "in_progress", "rider_arriving_dropoff"])
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
