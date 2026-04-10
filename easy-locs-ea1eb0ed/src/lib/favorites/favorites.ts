import { db } from "@/services/db";

export async function listFavoriteMerchants(userId: string) {
  const { data, error } = await db
    .from("user_favorites")
    .select("*")
    .eq("user_id", userId)
    .eq("entity_type", "merchant")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function isFavoriteMerchant(userId: string, merchantId: string) {
  const { data, error } = await db
    .from("user_favorites")
    .select("id")
    .eq("user_id", userId)
    .eq("entity_type", "merchant")
    .eq("entity_id", merchantId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

export async function addFavoriteMerchant(userId: string, merchantId: string) {
  const { data, error } = await db
    .from("user_favorites")
    .insert({
      user_id: userId,
      entity_type: "merchant",
      entity_id: merchantId,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function removeFavoriteMerchant(userId: string, merchantId: string) {
  const { error } = await db
    .from("user_favorites")
    .delete()
    .eq("user_id", userId)
    .eq("entity_type", "merchant")
    .eq("entity_id", merchantId);

  if (error) throw error;
  return true;
}

export async function toggleFavoriteMerchant(userId: string, merchantId: string) {
  const exists = await isFavoriteMerchant(userId, merchantId);
  if (exists) {
    await removeFavoriteMerchant(userId, merchantId);
    return { active: false };
  }
  await addFavoriteMerchant(userId, merchantId);
  return { active: true };
}
