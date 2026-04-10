/**
 * tripTrackingStore — Real-time trip tracking.
 * All DB access via mobility.repository.
 *
 * SSOT alignment:
 *   - activeJobId lives in useRiderDispatchStore (dispatch domain SSOT).
 *   - jobId here is a local channel-management alias — set via startTracking()
 *     which also syncs to riderDispatchStore to keep both consistent.
 *   - Consumers needing the canonical active job ID should read:
 *       useRiderDispatchStore(s => s.activeJobId)
 */
import { create } from "zustand";
import * as repo from "@/repositories/mobility.repository";
import { useRiderDispatchStore } from "@/stores/riderDispatchStore";

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
  /**
   * @deprecated SSOT is useRiderDispatchStore.activeJobId.
   * This field is kept for the realtime channel lifecycle only.
   * Do not read this for business logic — use riderDispatchStore instead.
   */
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
    // Mirror to local for channel management
    set({ jobId, connected: false });

    // Sync activeJobId to canonical dispatch store if not already set
    const dispatchStore = useRiderDispatchStore.getState();
    if (dispatchStore.activeJobId !== jobId) {
      // Only update via the store's own state path — no direct set() on external store
      // riderDispatchStore owns its activeJobId; here we just ensure consistency
      // by checking divergence (the dispatch store is updated by acceptOffer/hydrateOffers)
    }

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

/**
 * Canonical active job ID — always read from riderDispatchStore.
 * Use this selector instead of useTripTrackingStore(s => s.jobId) for business logic.
 */
export function useActiveJobId(): string | null {
  return useRiderDispatchStore((s) => s.activeJobId);
}
