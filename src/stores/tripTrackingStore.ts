/**
 * tripTrackingStore — Real-time trip tracking.
 * All DB access via mobility.repository.
 */
import { create } from "zustand";
import * as repo from "@/repositories/mobility.repository";

export interface TripLivePosition {
  lat: number | null;
  lng: number | null;
  heading: number | null;
  speed: number | null;
  customerLat: number | null;
  customerLng: number | null;
  updatedAt: string | null;
}

interface TripTrackingState {
  jobId: string | null;
  livePosition: TripLivePosition | null;
  connected: boolean;
  startTracking: (jobId: string) => void;
  stopTracking: () => void;
  pushRiderLocation: (jobId: string, lat: number, lng: number, heading?: number, speed?: number) => Promise<void>;
}

let activeChannel: any = null;

export const useTripTrackingStore = create<TripTrackingState>((set) => ({
  jobId: null,
  livePosition: null,
  connected: false,

  startTracking: (jobId) => {
    if (activeChannel) {
      repo.unsubscribeChannel(activeChannel);
      activeChannel = null;
    }
    set({ jobId, connected: false });
    repo.fetchTripLiveState(jobId).then(data => {
      if (data) {
        set({
          livePosition: {
            lat: (data as any).lat, lng: (data as any).lng,
            heading: (data as any).heading, speed: (data as any).speed,
            customerLat: (data as any).customer_lat, customerLng: (data as any).customer_lng,
            updatedAt: (data as any).updated_at,
          },
        });
      }
    });
    const ch = repo.subscribeToTable(`trip-live:${jobId}`, "trip_live_state", `job_id=eq.${jobId}`, (payload: any) => {
      const d = payload.new;
      if (d) {
        set({
          livePosition: {
            lat: d.lat, lng: d.lng, heading: d.heading, speed: d.speed,
            customerLat: d.customer_lat, customerLng: d.customer_lng, updatedAt: d.updated_at,
          },
        });
      }
    });
    activeChannel = ch;
  },

  stopTracking: () => {
    if (activeChannel) { repo.unsubscribeChannel(activeChannel); activeChannel = null; }
    set({ jobId: null, livePosition: null, connected: false });
  },

  pushRiderLocation: async (jobId, lat, lng, heading, speed) => {
    const userId = await repo.getCurrentUserId();
    if (!userId) return;
    const profile = await repo.fetchRiderProfile(userId);
    const now = new Date().toISOString();
    await repo.insertTripLocationPoint({
      job_id: jobId, rider_user_id: userId, rider_profile_id: profile?.id ?? null,
      lat, lng, heading: heading ?? null, speed: speed ?? null, recorded_at: now,
    });
    await repo.upsertTripLiveState({
      job_id: jobId, rider_user_id: userId, rider_profile_id: profile?.id ?? null,
      lat, lng, heading: heading ?? null, speed: speed ?? null, updated_at: now,
    });
  },
}));
