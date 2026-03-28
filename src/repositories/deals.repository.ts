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

function computeExpiryDate(option: string): string | null {
  if (option === "none") return null;
  const hours = parseInt(option);
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

/** Full deal creation with initial event */
export async function createDealWithEvent(params: {
  orgId: string; buyerId: string; contextType: string; contextId: string;
  contextTitle?: string; threadId?: string;
}) {
  const data = await createDealRoom({
    org_id: params.orgId, buyer_id: params.buyerId, context_type: params.contextType,
    context_id: params.contextId, context_title: params.contextTitle || "",
    thread_id: params.threadId || null, status: "inquiry",
  });
  await insertDealEvent({
    deal_id: data.id, event_type: "status_change", actor_id: params.buyerId,
    actor_role: "buyer", data_json: { new_status: "inquiry" },
  });
  return data;
}

/** Send offer or counter-offer */
export async function sendDealOffer(params: {
  dealId: string; amount: number; message: string; isCounter: boolean;
  expiry: string; currentRound: number; actorId: string; actorRole: string;
}) {
  if (!params.amount || params.amount <= 0) throw new Error("Invalid amount");
  const expiresAt = computeExpiryDate(params.expiry);
  const newRound = params.currentRound + 1;
  const updateData: any = params.isCounter
    ? { counter_offer_amount: params.amount, status: "counter_offer", offer_expires_at: expiresAt, negotiation_round: newRound }
    : { current_offer_amount: params.amount, status: "offer_sent", offer_expires_at: expiresAt, negotiation_round: newRound };
  await updateDealRoom(params.dealId, updateData);
  await insertDealEvent({
    deal_id: params.dealId, event_type: params.isCounter ? "counter_offer" : "offer",
    actor_id: params.actorId, actor_role: params.actorRole,
    round_number: newRound, expires_at: expiresAt,
    data_json: { amount: params.amount, message: params.message || null, expires_at: expiresAt, round: newRound },
  });
}

/** Accept deal + auto payment request */
export async function acceptDealAndPay(params: {
  deal: any; actorId: string; isOrgMember: boolean; targetOrgId: string;
  createPaymentRequest: (opts: any) => Promise<any>;
}) {
  const { deal, actorId, isOrgMember, targetOrgId, createPaymentRequest: createPR } = params;
  const accepted = deal.counter_offer_amount || deal.current_offer_amount;
  const currency = deal.current_offer_currency || "EUR";
  await updateDealRoom(deal.id, { accepted_amount: accepted, status: "accepted", offer_expires_at: null });
  await insertDealEvent({ deal_id: deal.id, event_type: "status_change", actor_id: actorId, data_json: { action: "accepted", accepted_amount: accepted } });
  if (accepted && accepted > 0 && isOrgMember) {
    try {
      const buyerProfile = await fetchBuyerProfile(deal.buyer_id);
      if (buyerProfile?.email) {
        await createPR({
          orgId: targetOrgId, senderId: actorId, recipientEmail: buyerProfile.email,
          recipientName: buyerProfile.name || "Customer", amount: accepted, currency,
          description: `Payment for "${deal.context_title || "deal"}"`,
          contextType: "deal", contextId: deal.id,
        });
        await updateDealRoom(deal.id, { status: "payment_pending" });
        await insertDealEvent({ deal_id: deal.id, event_type: "payment", actor_id: actorId, data_json: { action: "payment_request_sent", amount: accepted, currency } });
      }
    } catch (e) { console.error("[DealRoom] auto-payment failed:", e); }
  }
}

/** Cancel deal */
export async function cancelDealRoom(dealId: string) {
  await updateDealRoom(dealId, { status: "cancelled" });
}

/** Schedule visit event */
export async function scheduleDealVisit(dealId: string, actorId: string, actorRole: string, date: string, note: string) {
  await insertDealEvent({
    deal_id: dealId, event_type: "visit_scheduled", actor_id: actorId,
    actor_role: actorRole, data_json: { date, note: note || null },
  });
}
