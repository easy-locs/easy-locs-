import { supabase } from "@/integrations/supabase/client";

export interface SavedAddressInput {
  userId: string;
  label: string;
  line1: string;
  city: string;
  area?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isDefault?: boolean;
}

export async function listSavedAddresses(userId: string) {
  const { data, error } = await (supabase as any)
    .from("saved_addresses")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createSavedAddress(input: SavedAddressInput) {
  if (input.isDefault) {
    await clearDefaultAddress(input.userId);
  }

  const { data, error } = await (supabase as any)
    .from("saved_addresses")
    .insert({
      user_id: input.userId,
      label: input.label.trim(),
      line1: input.line1.trim(),
      city: input.city.trim(),
      area: input.area ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      is_default: !!input.isDefault,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateSavedAddress(params: {
  addressId: string;
  userId: string;
  label?: string;
  line1?: string;
  city?: string;
  area?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isDefault?: boolean;
}) {
  if (params.isDefault) {
    await clearDefaultAddress(params.userId);
  }

  const patch: Record<string, any> = { updated_at: new Date().toISOString() };
  if (params.label !== undefined) patch.label = params.label.trim();
  if (params.line1 !== undefined) patch.line1 = params.line1.trim();
  if (params.city !== undefined) patch.city = params.city.trim();
  if (params.area !== undefined) patch.area = params.area ?? null;
  if (params.latitude !== undefined) patch.latitude = params.latitude ?? null;
  if (params.longitude !== undefined) patch.longitude = params.longitude ?? null;
  if (params.isDefault !== undefined) patch.is_default = !!params.isDefault;

  const { data, error } = await (supabase as any)
    .from("saved_addresses")
    .update(patch)
    .eq("id", params.addressId)
    .eq("user_id", params.userId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSavedAddress(userId: string, addressId: string) {
  const { error } = await (supabase as any)
    .from("saved_addresses")
    .delete()
    .eq("id", addressId)
    .eq("user_id", userId);

  if (error) throw error;
  return true;
}

export async function clearDefaultAddress(userId: string) {
  const { error } = await (supabase as any)
    .from("saved_addresses")
    .update({ is_default: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("is_default", true);

  if (error) throw error;
  return true;
}

export async function setDefaultAddress(userId: string, addressId: string) {
  await clearDefaultAddress(userId);
  const { data, error } = await (supabase as any)
    .from("saved_addresses")
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq("id", addressId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getDefaultAddress(userId: string) {
  const { data, error } = await (supabase as any)
    .from("saved_addresses")
    .select("*")
    .eq("user_id", userId)
    .eq("is_default", true)
    .maybeSingle();

  if (error) throw error;
  return data;
}
