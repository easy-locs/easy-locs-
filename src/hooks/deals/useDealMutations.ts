/**
 * useDealMutations — Atomic: all deal room write operations.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createPaymentRequest } from "@/lib/shared/payment-request";
import { toast } from "sonner";

function computeExpiryDate(option: string): string | null {
  if (option === "none") return null;
  const hours = parseInt(option);
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

interface DealMutationsDeps {
  contextType: string;
  contextId: string;
  contextTitle?: string;
  targetOrgId: string;
  threadId?: string;
  userId: string;
  isOrgMember?: boolean;
}

export function useDealMutations(deps: DealMutationsDeps, dealId: string | null) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["deal_room_context"] });
    qc.invalidateQueries({ queryKey: ["deal_events"] });
  };

  const createDeal = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("deal_rooms").insert({
        org_id: deps.targetOrgId, buyer_id: deps.userId, context_type: deps.contextType,
        context_id: deps.contextId, context_title: deps.contextTitle || "", thread_id: deps.threadId || null, status: "inquiry" as any,
      } as any).select().single();
      if (error) throw error;
      await supabase.from("deal_events").insert({ deal_id: data.id, event_type: "status_change", actor_id: deps.userId, actor_role: "buyer", data_json: { new_status: "inquiry" } } as any);
      return data;
    },
    onSuccess: () => { invalidate(); toast.success("Deal Room created"); },
    onError: (e: any) => toast.error(e.message),
  });

  const sendOffer = useMutation({
    mutationFn: async (params: { amount: number; message: string; type: "offer" | "counter_offer"; expiry: string; deal: any }) => {
      const { amount, message, type, expiry, deal } = params;
      if (!amount || amount <= 0) throw new Error("Invalid amount");
      const isCounter = type === "counter_offer";
      const expiresAt = computeExpiryDate(expiry);
      const newRound = (deal?.negotiation_round || 0) + 1;
      const updateData: any = isCounter
        ? { counter_offer_amount: amount, status: "counter_offer", offer_expires_at: expiresAt, negotiation_round: newRound }
        : { current_offer_amount: amount, status: "offer_sent", offer_expires_at: expiresAt, negotiation_round: newRound };
      const { error } = await supabase.from("deal_rooms").update(updateData).eq("id", deal.id);
      if (error) throw error;
      await supabase.from("deal_events").insert({
        deal_id: deal.id, event_type: isCounter ? "counter_offer" : "offer",
        actor_id: deps.userId, actor_role: deps.isOrgMember ? "seller" : "buyer",
        round_number: newRound, expires_at: expiresAt,
        data_json: { amount, message: message || null, expires_at: expiresAt, round: newRound },
      } as any);
    },
    onSuccess: () => { invalidate(); toast.success("Offer sent"); },
    onError: (e: any) => toast.error(e.message),
  });

  const acceptDeal = useMutation({
    mutationFn: async (deal: any) => {
      const accepted = deal?.counter_offer_amount || deal?.current_offer_amount;
      const currency = deal?.current_offer_currency || "EUR";
      const { error } = await supabase.from("deal_rooms").update({ accepted_amount: accepted, status: "accepted" as any, offer_expires_at: null } as any).eq("id", deal.id);
      if (error) throw error;
      await supabase.from("deal_events").insert({ deal_id: deal.id, event_type: "status_change", actor_id: deps.userId, data_json: { action: "accepted", accepted_amount: accepted } } as any);
      if (accepted && accepted > 0 && deps.isOrgMember) {
        try {
          const { data: buyerProfile } = await supabase.from("profiles").select("email, name").eq("id", deal.buyer_id).single();
          if (buyerProfile?.email) {
            await createPaymentRequest({ orgId: deps.targetOrgId, senderId: deps.userId, recipientEmail: buyerProfile.email, recipientName: buyerProfile.name || "Customer", amount: accepted, currency, description: `Payment for "${deal.context_title || "deal"}"`, contextType: "deal", contextId: deal.id });
            await supabase.from("deal_rooms").update({ status: "payment_pending" as any } as any).eq("id", deal.id);
            await supabase.from("deal_events").insert({ deal_id: deal.id, event_type: "payment", actor_id: deps.userId, data_json: { action: "payment_request_sent", amount: accepted, currency } } as any);
          }
        } catch (e) { console.error("[DealRoom] auto-payment failed:", e); }
      }
    },
    onSuccess: () => { invalidate(); toast.success("Deal accepted! Payment request sent."); },
    onError: (e: any) => toast.error(e.message),
  });

  const cancelDeal = useMutation({
    mutationFn: async () => {
      if (!dealId) throw new Error("No deal");
      const { error } = await supabase.from("deal_rooms").update({ status: "cancelled" as any } as any).eq("id", dealId);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Deal cancelled"); },
    onError: (e: any) => toast.error(e.message),
  });

  const uploadDocument = useMutation({
    mutationFn: async (file: File) => {
      if (!dealId) throw new Error("No deal");
      const path = `deals/${dealId}/${Date.now()}-${file.name}`;
      const buckets = ["chat-media", "property-photos"];
      let finalUrl: string | null = null;
      for (const bucket of buckets) {
        const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
        if (error) continue;
        const { data: signedData } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365);
        finalUrl = signedData?.signedUrl || null;
        break;
      }
      if (!finalUrl) throw new Error("Upload failed");
      await supabase.from("deal_events").insert({ deal_id: dealId, event_type: "document", actor_id: deps.userId, actor_role: deps.isOrgMember ? "seller" : "buyer", data_json: { name: file.name, url: finalUrl, size: file.size } } as any);
    },
    onSuccess: () => { invalidate(); toast.success("Document shared"); },
    onError: (e: any) => toast.error(e.message),
  });

  const scheduleVisit = useMutation({
    mutationFn: async (params: { date: string; note: string }) => {
      if (!dealId) throw new Error("No deal");
      await supabase.from("deal_events").insert({ deal_id: dealId, event_type: "visit_scheduled", actor_id: deps.userId, actor_role: deps.isOrgMember ? "seller" : "buyer", data_json: { date: params.date, note: params.note || null } } as any);
    },
    onSuccess: () => { invalidate(); toast.success("Visit scheduled"); },
    onError: (e: any) => toast.error(e.message),
  });

  const generatePaymentLink = useMutation({
    mutationFn: async () => {
      if (!dealId) throw new Error("No deal");
      const { data, error } = await supabase.functions.invoke("orbit-payment", { body: { action: "deal_checkout", deal_id: dealId } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => { invalidate(); if (data?.url) { window.open(data.url, "_blank"); toast.success("Payment page opened"); } },
    onError: (e: any) => toast.error(e.message),
  });

  const verifyPayment = useMutation({
    mutationFn: async () => {
      if (!dealId) throw new Error("No deal");
      const { data, error } = await supabase.functions.invoke("orbit-payment", { body: { action: "deal_verify_payment", deal_id: dealId } });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => { invalidate(); toast.success(data?.paid ? "Payment confirmed!" : "Payment not yet received."); },
    onError: (e: any) => toast.error(e.message),
  });

  return { createDeal, sendOffer, acceptDeal, cancelDeal, uploadDocument, scheduleVisit, generatePaymentLink, verifyPayment };
}
