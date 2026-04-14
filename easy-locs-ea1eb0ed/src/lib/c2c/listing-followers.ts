import { db } from "@/services/db";

const ENTITY_TYPE = "c2c_listing";

export async function followListing(userId: string, listingId: string): Promise<void> {
  const { error } = await db
    .from("user_favorites")
    .upsert({ user_id: userId, entity_type: ENTITY_TYPE, entity_id: listingId }, { onConflict: "user_id,entity_type,entity_id" });
  if (error) throw error;
}

export async function unfollowListing(userId: string, listingId: string): Promise<void> {
  const { error } = await db
    .from("user_favorites")
    .delete()
    .eq("user_id", userId)
    .eq("entity_type", ENTITY_TYPE)
    .eq("entity_id", listingId);
  if (error) throw error;
}

export async function isFollowingListing(userId: string, listingId: string): Promise<boolean> {
  const { data, error } = await db
    .from("user_favorites")
    .select("id")
    .eq("user_id", userId)
    .eq("entity_type", ENTITY_TYPE)
    .eq("entity_id", listingId)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

export async function toggleFollowListing(userId: string, listingId: string): Promise<boolean> {
  const following = await isFollowingListing(userId, listingId);
  if (following) {
    await unfollowListing(userId, listingId);
    return false;
  }
  await followListing(userId, listingId);
  return true;
}

export async function getListingFollowerIds(listingId: string): Promise<string[]> {
  const { data, error } = await db
    .from("user_favorites")
    .select("user_id")
    .eq("entity_type", ENTITY_TYPE)
    .eq("entity_id", listingId)
    .limit(500);
  if (error || !data) return [];
  return data.map((f: any) => f.user_id);
}
