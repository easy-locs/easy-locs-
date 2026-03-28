import { supabase } from "@/integrations/supabase/client";

export async function fetchMerchantProfile(profileId: string) {
  const { data } = await (supabase as any)
    .from("merchant_onboarding_profiles")
    .select("*")
    .eq("id", profileId)
    .maybeSingle();
  return data;
}

export async function fetchMenuItems(profileId: string) {
  const { data } = await (supabase as any)
    .from("menu_items")
    .select("id, name, name_ar, price, is_available, description, description_ar")
    .eq("merchant_profile_id", profileId)
    .order("sort_order");
  return data || [];
}

export async function fetchStorefrontSlug(profileId: string) {
  const { data } = await (supabase as any)
    .from("storefront_pages")
    .select("slug, active, shop_visibility")
    .eq("merchant_profile_id", profileId)
    .maybeSingle();
  return data;
}

export async function deleteMenuItem(id: string) {
  await (supabase as any).from("menu_items").delete().eq("id", id);
}

export async function upsertMenuItem(item: { id?: string; isNew?: boolean; merchant_profile_id: string; name: string; name_ar?: string | null; price: number | null; is_available: boolean; sort_order: number }) {
  const payload = {
    merchant_profile_id: item.merchant_profile_id,
    name: item.name,
    name_ar: item.name_ar ?? null,
    price: item.price,
    is_available: item.is_available,
    sort_order: item.sort_order,
  };
  if (item.isNew) {
    await (supabase as any).from("menu_items").insert(payload);
  } else {
    await (supabase as any).from("menu_items").update(payload).eq("id", item.id);
  }
}

export async function translateText(text: string, fromLocale: string, toLocale: string) {
  const { data } = await supabase.functions.invoke("translate-message", {
    body: { text, from_locale: fromLocale, to_locale: toLocale },
  });
  return data?.translated as string | undefined;
}
