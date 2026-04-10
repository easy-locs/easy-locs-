/**
 * Gift Card Repository — Canonical data access for gift cards.
 * Extracts direct supabase calls from GiftCardManager into repository layer.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export interface GiftCardRow {
  id: string;
  shop_id: string;
  code: string;
  type: string;
  initial_amount: number;
  remaining_amount: number;
  currency: string;
  status: string;
  purchaser_id: string | null;
  recipient_id: string | null;
  recipient_email: string | null;
  message: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export async function fetchGiftCards(
  shopId: string,
  mode: "seller" | "buyer",
  userId: string,
): Promise<GiftCardRow[]> {
  let q = db("storefront_gift_cards").select("*").eq("shop_id", shopId);
  if (mode === "buyer") {
    q = q.or(`purchaser_id.eq.${userId},recipient_id.eq.${userId}`);
  }
  const { data } = await q.order("created_at", { ascending: false });
  return data || [];
}

export async function createGiftCard(input: {
  shopId: string;
  code: string;
  type: string;
  amount: number;
  purchaserId: string;
  recipientEmail?: string | null;
  message?: string | null;
}): Promise<void> {
  const { error } = await db("storefront_gift_cards").insert({
    shop_id: input.shopId,
    code: input.code,
    type: input.type,
    initial_amount: input.amount,
    remaining_amount: input.amount,
    purchaser_id: input.purchaserId,
    recipient_email: input.recipientEmail || null,
    message: input.message || null,
    expires_at: new Date(Date.now() + 365 * 86400000).toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function redeemGiftCard(
  code: string,
  shopId: string,
  userId: string,
): Promise<void> {
  const { data: card } = await db
    .from("storefront_gift_cards")
    .select("*")
    .eq("code", code.trim().toUpperCase())
    .eq("shop_id", shopId)
    .eq("status", "active")
    .maybeSingle();

  if (!card) throw new Error("Invalid or expired code");

  const { error: updateError } = await db
    .from("storefront_gift_cards")
    .update({
      recipient_id: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", card.id);
  if (updateError) throw new Error(updateError.message);

  const { error: txError } = await db
    .from("storefront_gift_card_transactions")
    .insert({
      gift_card_id: card.id,
      amount: 0,
      type: "purchase",
      user_id: userId,
    });
  if (txError) throw new Error(txError.message);
}
