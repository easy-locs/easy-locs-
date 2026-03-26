/**
 * tripTrackingStore — Real-time trip tracking for both customer and rider views.
 * Reads from: trip_live_state (canonical mobility_jobs FK)
 * Writes to: trip_location_points, trip_live_state
 */
import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

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

let activeChannel: ReturnType<typeof supabase.channel> | null = null;

export const useTripTrackingStore = create<TripTrackingState>((set) => ({
  jobId: null,
  livePosition: null,
  connected: false,

  startTracking: (jobId) => {
    if (activeChannel) {
      supabase.removeChannel(activeChannel);
      activeChannel = null;
    }

    set({ jobId, connected: false });

    // Fetch initial state
    supabase
      .from("trip_live_state")
      .select("*")
      .eq("job_id", jobId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          set({
            livePosition: {
              lat: (data as any).lat,
              lng: (data as any).lng,
              heading: (data as any).heading,
              speed: (data as any).speed,
              customerLat: (data as any).customer_lat,
              customerLng: (data as any).customer_lng,
              updatedAt: (data as any).updated_at,
            },
          });
        }
      });

    // Subscribe to realtime updates
    const ch = supabase
      .channel(`trip-live:${jobId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "trip_live_state",
        filter: `job_id=eq.${jobId}`,
      }, (payload: any) => {
        const d = payload.new;
        if (d) {
          set({
            livePosition: {
              lat: d.lat,
              lng: d.lng,
              heading: d.heading,
              speed: d.speed,
              customerLat: d.customer_lat,
              customerLng: d.customer_lng,
              updatedAt: d.updated_at,
            },
          });
        }
      })
      .subscribe((status) => {
        set({ connected: status === "SUBSCRIBED" });
      });

    activeChannel = ch;
  },

  stopTracking: () => {
    if (activeChannel) {
      supabase.removeChannel(activeChannel);
      activeChannel = null;
    }
    set({ jobId: null, livePosition: null, connected: false });
  },

  pushRiderLocation: async (jobId, lat, lng, heading, speed) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get rider profile id
    const { data: profile } = await supabase
      .from("rider_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    const now = new Date().toISOString();

    // Insert breadcrumb
    await supabase.from("trip_location_points").insert({
      job_id: jobId,
      rider_user_id: user.id,
      rider_profile_id: profile?.id ?? null,
      lat, lng,
      heading: heading ?? null,
      speed: speed ?? null,
      recorded_at: now,
    });

    // Upsert live state
    await supabase.from("trip_live_state").upsert({
      job_id: jobId,
      rider_user_id: user.id,
      rider_profile_id: profile?.id ?? null,
      lat, lng,
      heading: heading ?? null,
      speed: speed ?? null,
      updated_at: now,
    });
  },
}));
