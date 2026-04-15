import { domainDb, db } from "@/services/db";
import type { OrbitProfile } from "@/domains/shared/canonical-types";

export {
  fetchBaseProfile,
  fetchOwnerProfile,
  fetchTenantProfile,
  updateProfile,
} from "@/repositories/profile.repository";

export const meRepo = {
  async getIdentityProfile(userId: string): Promise<OrbitProfile | null> {
    const { data, error } = await domainDb.identity
      .from("profiles")
      .select("id, orbit_id, name, first_name, last_name, avatar_url, email, phone, country, city, bio, language, currency, kyc_status, device_bound, contacts_synced, created_at, updated_at")
      .eq("id", userId)
      .maybeSingle();
    if (error || !data) return null;
    return {
      userId: data.id,
      orbitId: data.orbit_id ?? data.id,
      displayName: data.name ?? [data.first_name, data.last_name].filter(Boolean).join(" ") ?? "",
      avatarUrl: data.avatar_url ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      country: data.country ?? null,
      city: data.city ?? null,
      bio: data.bio ?? null,
      language: data.language ?? "en",
      currency: data.currency ?? "USD",
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } as OrbitProfile;
  },

  async getOrganizations(userId: string) {
    const { data, error } = await domainDb.identity
      .from("organizations")
      .select("*")
      .eq("owner_user_id", userId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[me.repo] getOrganizations error:", error.message);
      throw new Error(`Failed to fetch organizations: ${error.message}`);
    }
    return data ?? [];
  },

  async getOrganizationMembers(orgId: string) {
    const { data, error } = await domainDb.identity
      .from("organization_members")
      .select("*")
      .eq("org_id", orgId);
    if (error) {
      console.error("[me.repo] getOrganizationMembers error:", error.message);
      throw new Error(`Failed to fetch organization members: ${error.message}`);
    }
    return data ?? [];
  },

  async getProfileTrustFields(userId: string) {
    const { data, error } = await domainDb.identity
      .from("profiles")
      .select("kyc_status, device_bound, contacts_synced")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      console.error("[me.repo] getProfileTrustFields error:", error.message);
      throw new Error(`Failed to fetch trust fields: ${error.message}`);
    }
    return data;
  },

  async fetchMediaAsset(bucket: string, path: string) {
    const { data, error } = await db
      .from("media_assets")
      .select("lqip_hash, variants")
      .eq("bucket", bucket)
      .eq("path", path)
      .maybeSingle();
    if (error) {
      console.error("[me.repo] fetchMediaAsset error:", error.message);
      throw new Error(`Failed to fetch media asset: ${error.message}`);
    }
    return data;
  },

  async fetchTrustGraph(userId: string) {
    const { data, error } = await db
      .from("user_trust_graph")
      .select("disputes_count, cancellations_count, moderation_flags, reported_by_count")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      console.error("[me.repo] fetchTrustGraph error:", error.message);
      throw new Error(`Failed to fetch trust graph: ${error.message}`);
    }
    return data;
  },

  async fetchNotificationPreferences(userId: string) {
    const { data, error } = await domainDb.notification
      .from("user_notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      console.error("[me.repo] fetchNotificationPreferences error:", error.message);
      throw new Error(`Failed to fetch notification preferences: ${error.message}`);
    }
    return data;
  },
};
