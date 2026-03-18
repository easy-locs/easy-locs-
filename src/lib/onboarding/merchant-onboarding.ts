/**
 * Merchant auto-onboarding pipeline — intake, menu import, normalize, activate.
 */
import { supabase } from "@/integrations/supabase/client";

export async function createOnboardingSource(params: {
  workspaceId?: string;
  sourceType: string;
  sourceName?: string;
  sourceExternalId?: string;
  payload?: Record<string, any>;
}) {
  const { data, error } = await supabase
    .from("merchant_onboarding_sources")
    .insert({
      workspace_id: params.workspaceId ?? null,
      source_type: params.sourceType,
      source_name: params.sourceName ?? null,
      source_external_id: params.sourceExternalId ?? null,
      payload: params.payload ?? {},
      status: "received",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function createMerchantOnboardingProfile(params: {
  workspaceId?: string;
  sourceId?: string;
  merchantName: string;
  legalName?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  cuisineType?: string;
  city?: string;
  area?: string;
  deliveryRadiusKm?: number;
  activationMode?: "manual" | "semi_auto" | "auto";
  metadata?: Record<string, any>;
}) {
  const { data, error } = await supabase
    .from("merchant_onboarding_profiles")
    .insert({
      workspace_id: params.workspaceId ?? null,
      source_id: params.sourceId ?? null,
      merchant_name: params.merchantName,
      legal_name: params.legalName ?? null,
      contact_name: params.contactName ?? null,
      phone: params.phone ?? null,
      email: params.email ?? null,
      cuisine_type: params.cuisineType ?? null,
      city: params.city ?? null,
      area: params.area ?? null,
      delivery_radius_km: params.deliveryRadiusKm ?? null,
      onboarding_status: "draft",
      activation_mode: params.activationMode ?? "semi_auto",
      metadata: params.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function bulkImportMerchantMenuItems(params: {
  profileId: string;
  items: Array<{
    categoryName?: string;
    itemName: string;
    itemDescription?: string;
    price?: number;
    currency?: string;
    imageUrl?: string;
  }>;
}) {
  if (!params.items.length) return [];

  const payload = params.items.map((item) => ({
    profile_id: params.profileId,
    category_name: item.categoryName ?? null,
    item_name: item.itemName,
    item_description: item.itemDescription ?? null,
    price: item.price ?? null,
    currency: item.currency ?? "AED",
    image_url: item.imageUrl ?? null,
    normalized: false,
    published: false,
  }));

  const { data, error } = await supabase
    .from("merchant_menu_import_items")
    .insert(payload)
    .select("*");

  if (error) throw error;
  return data ?? [];
}

export async function normalizeMerchantMenu(profileId: string) {
  const { data: items, error } = await supabase
    .from("merchant_menu_import_items")
    .select("*")
    .eq("profile_id", profileId);

  if (error) throw error;

  for (const item of items ?? []) {
    const normalizedName = (item.item_name as string).trim().replace(/\s+/g, " ");
    await supabase
      .from("merchant_menu_import_items")
      .update({ item_name: normalizedName, normalized: true })
      .eq("id", item.id);
  }

  await supabase
    .from("merchant_onboarding_profiles")
    .update({ onboarding_status: "menu_pending" })
    .eq("id", profileId);

  return true;
}

export async function activateMerchantProfile(profileId: string) {
  await supabase
    .from("merchant_onboarding_profiles")
    .update({ onboarding_status: "live" })
    .eq("id", profileId);

  await supabase.from("merchant_activation_events").insert([
    { profile_id: profileId, event_type: "storefront_created", payload: {} },
    { profile_id: profileId, event_type: "menu_imported", payload: {} },
    { profile_id: profileId, event_type: "account_activated", payload: {} },
  ]);

  return true;
}
