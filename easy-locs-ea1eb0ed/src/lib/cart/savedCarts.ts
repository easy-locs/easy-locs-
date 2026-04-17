import { db } from "@/services/db";

import { cFrom, cRpc } from "@/lib/execution/content-mutation";
export async function saveCartSnapshot(params: {
  userId: string;
  merchantId?: string | null;
  merchantName?: string | null;
  items: Array<{
    menuItemId?: string | null;
    name: string;
    quantity: number;
    unitPrice: number;
    notes?: string | null;
  }>;
  label?: string | null;
}) {
  const payload = {
    user_id: params.userId,
    merchant_id: params.merchantId ?? null,
    merchant_name: params.merchantName ?? null,
    label: params.label ?? "Saved cart",
    items_json: params.items as any,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await cFrom("saved_carts")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listSavedCarts(userId: string) {
  const { data, error } = await cFrom("saved_carts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function deleteSavedCart(savedCartId: string) {
  const { error } = await cFrom("saved_carts")
    .delete()
    .eq("id", savedCartId);

  if (error) throw error;
  return true;
}
