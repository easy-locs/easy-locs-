import { db } from "./db";


export interface ProfileRow {
  id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: string | null;
  org_id: string | null;
}

export interface NotificationPrefRow {
  id: string;
  user_id: string;
  channel: string;
  enabled: boolean;
}

export const userService = {
  async fetchProfile(userId: string) {
    const { data, error } = await db("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle() as { data: ProfileRow | null; error: unknown };
    if (error) throw error;
    return data;
  },

  async fetchProfileByEmail(email: string) {
    const { data, error } = await db("profiles")
      .select("*")
      .eq("email", email)
      .maybeSingle() as { data: ProfileRow | null; error: unknown };
    if (error) throw error;
    return data;
  },

  async updateProfile(userId: string, updates: Partial<ProfileRow>) {
    const { error } = await db("profiles")
      .update(updates)
      .eq("id", userId);
    if (error) throw error;
  },

  async fetchNotificationPrefs(userId: string) {
    const { data, error } = await db("notification_preferences")
      .select("*")
      .eq("user_id", userId) as { data: NotificationPrefRow[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async upsertNotificationPref(userId: string, channel: string, enabled: boolean) {
    const { error } = await db("notification_preferences")
      .upsert({ user_id: userId, channel, enabled }, { onConflict: "user_id,channel" });
    if (error) throw error;
  },

  async fetchFavorites(userId: string) {
    const { data, error } = await db("user_favorites")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async toggleFavorite(userId: string, entityId: string, entityType: string) {
    const { data: existing, error: selectErr } = await db("user_favorites")
      .select("id")
      .eq("user_id", userId)
      .eq("entity_id", entityId)
      .maybeSingle() as { data: { id: string } | null; error: unknown };
    if (selectErr) throw selectErr;

    if (existing) {
      const { error: delErr } = await db("user_favorites").delete().eq("id", existing.id).eq("user_id", userId);
      if (delErr) throw delErr;
      return false;
    } else {
      const { error: insErr } = await db("user_favorites").insert({ user_id: userId, entity_id: entityId, entity_type: entityType });
      if (insErr) throw insErr;
      return true;
    }
  },

  async fetchNotificationCategoryPrefs(userId: string) {
    const { data, error } = await db("user_notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle() as { data: { category_prefs: unknown; quiet_hours_enabled: boolean } | null; error: unknown };
    if (error) throw error;
    return data;
  },

  async upsertNotificationCategoryPrefs(userId: string, categoryPrefs: Record<string, unknown>, quietHoursEnabled: boolean) {
    const { error } = await db("user_notification_preferences")
      .upsert({
        user_id: userId,
        category_prefs: categoryPrefs,
        quiet_hours_enabled: quietHoursEnabled,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    if (error) throw error;
  },
};
