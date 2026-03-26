/**
 * tripTrackingStore — Real-time trip tracking for both customer and rider views.
 * Reads from trip_live_state and trip_location_points.
 */
import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

export interface TripLivePosition {
  riderLat: number | null;
  riderLng: number | null;
  riderHeading: number | null;
  riderSpeed: number | null;
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

export const useTripTrackingStore = create<TripTrackingState>((set, get) => ({
  jobId: null,
  livePosition: null,
  connected: false,

  startTracking: (jobId) => {
    // Clean up previous
    if (activeChannel) {
      supabase.removeChannel(activeChannel);
      activeChannel = null;
    }

    set({ jobId, connected: false });

    // Fetch initial state
    (supabase as any)
      .from("trip_live_state")
      .select("*")
      .eq("job_id", jobId)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) {
          set({
            livePosition: {
              riderLat: data.rider_lat,
              riderLng: data.rider_lng,
              riderHeading: data.rider_heading,
              riderSpeed: data.rider_speed_kmh,
              customerLat: data.customer_lat,
              customerLng: data.customer_lng,
              updatedAt: data.updated_at,
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
              riderLat: d.rider_lat,
              riderLng: d.rider_lng,
              riderHeading: d.rider_heading,
              riderSpeed: d.rider_speed_kmh,
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

    // Insert breadcrumb
    await (supabase as any).from("trip_location_points").insert({
      job_id: jobId,
      rider_user_id: user.id,
      lat, lng,
      heading: heading ?? null,
      speed_kmh: speed ?? null,
      recorded_at: new Date().toISOString(),
    });

    // Upsert live state
    await (supabase as any).from("trip_live_state").upsert({
      job_id: jobId,
      rider_lat: lat,
      rider_lng: lng,
      rider_heading: heading ?? null,
      rider_speed_kmh: speed ?? null,
      updated_at: new Date().toISOString(),
    });
  },
}));
