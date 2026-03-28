/**
 * deals.repository.ts — Single source of truth for all Deal Room DB operations.
 * Eliminates triple duplication: useDealMutations, useDealRoomActions, useDealRoomMutations.
 */
import { supabase } from "@/integrations/supabase/client";

export async function createDealRoom(record: Record<string, any>) {
  const { data, error } = await supabase.from("deal_rooms").insert(record as any).select().single();
  if (error) throw error;
  return data;
}

export async function updateDealRoom(dealId: string, update: Record<string, any>) {
  const { error } = await supabase.from("deal_rooms").update(update as any).eq("id", dealId);
  if (error) throw error;
}

export async function insertDealEvent(record: Record<string, any>) {
  await supabase.from("deal_events").insert(record as any);
}

export async function fetchBuyerProfile(buyerId: string) {
  const { data } = await supabase.from("profiles").select("email, name").eq("id", buyerId).single();
  return data;
}

export async function uploadDealDocument(dealId: string, file: File) {
  const path = `deals/${dealId}/${Date.now()}-${file.name}`;
  const buckets = ["chat-media", "property-photos"];
  for (const bucket of buckets) {
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
    if (error) continue;
    const { data: signedData } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signedData?.signedUrl) return signedData.signedUrl;
  }
  throw new Error("Upload failed");
}

export async function invokeDealPayment(action: string, dealId: string) {
  const { data, error } = await supabase.functions.invoke("orbit-payment", {
    body: { action, deal_id: dealId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
