import { supabase } from "@/integrations/supabase/client";

async function getCurrentUserId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not authenticated");
  return data.user.id;
}

export async function createSavedAddress(params: {
  label: string;
  fullAddress: string;
  building?: string;
  unitNumber?: string;
  area?: string;
  city?: string;
  countryCode?: string;
  lat?: number;
  lng?: number;
  deliveryNotes?: string;
  isDefault?: boolean;
}) {
  const userId = await getCurrentUserId();

  if (params.isDefault) {
    await (supabase as any)
      .from("saved_addresses")
      .update({ is_default: false } as any)
      .eq("user_id", userId);
  }

  const { data, error } = await (supabase as any)
    .from("saved_addresses")
    .insert({
      user_id: userId,
      label: params.label,
      full_address: params.fullAddress,
      building: params.building ?? null,
      unit_number: params.unitNumber ?? null,
      area: params.area ?? null,
      city: params.city ?? "Dubai",
      country_code: params.countryCode ?? "AE",
      lat: params.lat ?? null,
      lng: params.lng ?? null,
      delivery_notes: params.deliveryNotes ?? null,
      is_default: params.isDefault ?? false,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listMyAddresses() {
  const userId = await getCurrentUserId();

  const { data, error } = await (supabase as any)
    .from("saved_addresses")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}
