/**
 * riderDispatchStore — Rider-only dispatch state.
 * All DB access via mobility.repository.
 */
import { create } from "zustand";
import * as repo from "@/repositories/mobility.repository";

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
  job?: any;
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
    const userId = await repo.getCurrentUserId();
    if (!userId) return;
    const profile = await repo.fetchRiderProfile(userId);
    if (!profile) return;
    const pres = await repo.fetchRiderPresence(profile.id);
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
    const userId = await repo.getCurrentUserId();
    if (!userId) return;
    const { presence } = get();
    if (!presence.profileId) return;
    const newOnline = !presence.isOnline;
    const now = new Date().toISOString();
    await repo.upsertRiderPresence({
      rider_profile_id: presence.profileId, user_id: userId,
      is_online: newOnline, is_available: newOnline,
      vehicle_type: presence.vehicleType,
      service_modes: presence.serviceModes.length ? presence.serviceModes : ["taxi", "delivery"],
      last_seen_at: now, updated_at: now,
    });
    await repo.updateRiderProfile(presence.profileId, { is_online: newOnline, is_available: newOnline, updated_at: now });
    set(s => ({ presence: { ...s.presence, isOnline: newOnline, isAvailable: newOnline } }));
  },

  updateLocation: async (lat, lng, heading, speed) => {
    const userId = await repo.getCurrentUserId();
    if (!userId) return;
    const { presence } = get();
    if (!presence.profileId) return;
    const now = new Date().toISOString();
    await repo.upsertRiderPresence({
      rider_profile_id: presence.profileId, user_id: userId,
      lat, lng, heading: heading ?? null, speed: speed ?? null,
      last_seen_at: now, updated_at: now,
      vehicle_type: presence.vehicleType,
      service_modes: presence.serviceModes.length ? presence.serviceModes : ["taxi", "delivery"],
    });
    set(s => ({ presence: { ...s.presence, lat, lng } }));
  },

  hydrateOffers: async () => {
    const userId = await repo.getCurrentUserId();
    if (!userId) return;
    set({ loading: true });
    const data = await repo.fetchPendingOffers(userId);
    set({ offers: data as unknown as MobilityOffer[], loading: false });
    const activeJobs = await repo.fetchMobilityJobs({
      riderUserId: userId,
      statuses: ["accepted", "rider_arriving_pickup", "rider_arrived_pickup", "picked_up", "in_progress", "rider_arriving_dropoff"],
      limit: 1,
    });
    if (activeJobs[0]) set({ activeJobId: activeJobs[0].id });
  },

  acceptOffer: async (offerId) => {
    const data = await repo.invokeDispatchRide({ action: "accept_offer", offer_id: offerId });
    set(s => ({ offers: s.offers.filter(o => o.id !== offerId), activeJobId: data.job_id }));
  },

  rejectOffer: async (offerId) => {
    await repo.invokeDispatchRide({ action: "reject_offer", offer_id: offerId });
    set(s => ({ offers: s.offers.filter(o => o.id !== offerId) }));
  },

  advanceJobStatus: async (jobId, nextStatus) => {
    await repo.invokeDispatchRide({ action: "advance_status", job_id: jobId, status: nextStatus });
    if (["completed", "cancelled"].includes(nextStatus)) set({ activeJobId: null });
  },
}));
