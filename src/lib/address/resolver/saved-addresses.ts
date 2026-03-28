/**
 * Canonical Address Resolver — User saved addresses operations.
 */
import { supabase } from "@/integrations/supabase/client";
import type { UserSavedAddress } from "./types";

export async function getUserSavedAddresses(userId: string): Promise<UserSavedAddress[]> {
  const { data } = await (supabase as any)
    .from("user_saved_addresses")
    .select("*, place:canonical_places(*)")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("is_favorite", { ascending: false })
    .order("last_used_at", { ascending: false, nullsFirst: false });
  return data ?? [];
}

export async function saveUserAddress(params: {
  userId: string;
  canonicalPlaceId: string;
  label?: string;
  contactName?: string;
  contactPhone?: string;
  apartment?: string;
  floor?: string;
  deliveryNote?: string;
  isDefault?: boolean;
  isFavorite?: boolean;
}): Promise<UserSavedAddress | null> {
  if (params.isDefault) {
    await (supabase as any)
      .from("user_saved_addresses")
      .update({ is_default: false })
      .eq("user_id", params.userId)
      .eq("is_default", true);
  }

  const { data, error } = await (supabase as any)
    .from("user_saved_addresses")
    .insert({
      user_id: params.userId,
      canonical_place_id: params.canonicalPlaceId,
      label: params.label ?? null,
      contact_name: params.contactName ?? null,
      contact_phone: params.contactPhone ?? null,
      apartment: params.apartment ?? null,
      floor: params.floor ?? null,
      delivery_note: params.deliveryNote ?? null,
      is_default: params.isDefault ?? false,
      is_favorite: params.isFavorite ?? false,
    })
    .select("*")
    .single();

  if (error) console.error("[address-resolver] save address failed:", error);
  return data;
}

export async function deleteUserAddress(addressId: string): Promise<void> {
  await (supabase as any).from("user_saved_addresses").delete().eq("id", addressId);
}
