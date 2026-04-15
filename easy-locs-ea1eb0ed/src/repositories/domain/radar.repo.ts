import { domainDb, db } from "@/services/db";

export { fetchRadarLiveData } from "@/repositories/radar-repository";
// db (not domainDb) used for tables not yet assigned to a domain schema

export const radarRepo = {
  async fetchUserRadarEvents(userId: string, limit = 50) {
    const { data } = await domainDb.analytics
      .from("user_radar_events")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    return data ?? [];
  },

  async fetchUserRadarProfile(userId: string) {
    const { data } = await domainDb.analytics
      .from("user_radar_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    return data;
  },

  async fetchGeoLiveContext() {
    const { data } = await db.from("geo_live_context").select("*");
    return data ?? [];
  },

  async fetchActiveZoneEvents() {
    const { data } = await db.from("zone_events").select("*").eq("is_active", true);
    return data ?? [];
  },

  async fetchOnlineRiders() {
    const { data } = await db.from("rider_runtime_state").select("*").eq("is_online", true);
    return data ?? [];
  },
};
