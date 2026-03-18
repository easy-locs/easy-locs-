import { supabase } from "@/integrations/supabase/client";

async function tryGetCurrentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function rebuildCustomerRecommendations(params: {
  workspaceId?: string;
  merchantProfileId?: string;
}) {
  const userId = await tryGetCurrentUserId();
  if (!userId || !params.merchantProfileId) return;

  // Clear old recommendations
  await (supabase as any)
    .from("customer_recommendations")
    .delete()
    .eq("user_id", userId)
    .eq("merchant_profile_id", params.merchantProfileId);

  // Fetch top menu items as simple recommendations
  const { data: menuItems } = await (supabase as any)
    .from("menu_items")
    .select("*")
    .eq("merchant_profile_id", params.merchantProfileId)
    .eq("is_available", true)
    .order("price", { ascending: false })
    .limit(10);

  for (const item of menuItems ?? []) {
    await (supabase as any).from("customer_recommendations").insert({
      workspace_id: params.workspaceId ?? null,
      user_id: userId,
      merchant_profile_id: params.merchantProfileId,
      menu_item_id: item.id,
      score: Number(item.price ?? 0),
      reason: "Top-value recommendation",
    });
  }
}

export async function listMyRecommendations(params: {
  merchantProfileId?: string;
}) {
  const userId = await tryGetCurrentUserId();
  if (!userId) return [];

  let query = (supabase as any)
    .from("customer_recommendations")
    .select("*, menu_items(*)")
    .eq("user_id", userId)
    .order("score", { ascending: false })
    .limit(20);

  if (params.merchantProfileId) {
    query = query.eq("merchant_profile_id", params.merchantProfileId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
