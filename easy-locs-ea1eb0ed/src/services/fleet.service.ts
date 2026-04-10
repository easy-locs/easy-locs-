import { db } from "./db";


export const fleetService = {
  async fetchRiderPresence(userId: string) {
    const { data, error } = await db("rider_presence")
      .select("is_online")
      .eq("user_id", userId)
      .maybeSingle() as { data: { is_online: boolean } | null; error: unknown };
    if (error) throw error;
    return data;
  },

  async upsertRiderPresence(userId: string, isOnline: boolean) {
    const { error } = await db("rider_presence")
      .upsert({
        user_id: userId,
        is_online: isOnline,
        is_available: isOnline,
        current_status: isOnline ? "online" : "offline",
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" } as any);
    if (error) throw error;
  },

  async fetchDriverCompletedOrders(driverId: string, limit = 200) {
    const { data, error } = await db("orders")
      .select("*")
      .eq("driver_id", driverId)
      .in("status", ["delivered", "completed"])
      .order("updated_at", { ascending: false })
      .limit(limit) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchMobilityJobs(driverId: string, statuses?: string[], limit = 100) {
    let q = db("mobility_jobs")
      .select("*")
      .eq("driver_id", driverId);
    if (statuses?.length) q = q.in("status", statuses);
    q = q.order("created_at", { ascending: false }).limit(limit);
    const { data, error } = await q as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async updateMobilityJobStatus(jobId: string, status: string) {
    const { error } = await db("mobility_jobs")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", jobId);
    if (error) throw error;
  },

  async fetchDriverProfile(userId: string) {
    const { data, error } = await db("driver_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle() as { data: unknown | null; error: unknown };
    if (error) throw error;
    return data;
  },

  async fetchAllDriverProfiles(limit = 1000) {
    const { data, error } = await db("driver_profiles")
      .select("*")
      .limit(limit) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchAllDriverProfilesOrdered(limit = 300) {
    const { data, error } = await db("driver_profiles")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(limit) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchMobilityJobById(jobId: string) {
    const { data, error } = await db("mobility_jobs")
      .select("*")
      .eq("id", jobId)
      .single() as { data: unknown | null; error: unknown };
    if (error) throw error;
    return data;
  },
};
