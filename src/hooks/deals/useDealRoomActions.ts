/**
 * useDealRoomActions — All Deal Room mutations extracted from DealRoomPanel.
 * Pure business logic hook, zero UI.
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

interface UseDealRoomActionsParams {
  deal: any;
  userId: string | undefined;
  isOrgMember?: boolean;
  targetOrgId: string;
  contextType: string;
  contextId: string;
  contextTitle?: string;
  threadId?: string;
}

export function useDealRoomActions({
  deal, userId, isOrgMember, targetOrgId, contextType, contextId, contextTitle, threadId,
}: UseDealRoomActionsParams) {
  const qc = useQueryClient();
  const dealQueryKey = ["deal_room_context", contextType, contextId];
  const eventsQueryKey = ["deal_events"];

  const createDeal = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("deal_rooms")
        .insert({
          org_id: targetOrgId, buyer_id: userId!, context_type: contextType,
          context_id: contextId, context_title: contextTitle || "",
          thread_id: threadId || null, status: "inquiry" as any,
        } as any)
        .select().single();
      if (error) throw error;
      await supabase.from("deal_events").insert({
        deal_id: data.id, event_type: "status_change", actor_id: userId!,
        actor_role: "buyer", data_json: { new_status: "inquiry" },
      } as any);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: dealQueryKey }); toast.success("Deal Room created"); },
    onError: (e: any) => toast.error(e.message),
  });

  const sendOffer = useMutation({
    mutationFn: async ({ amount, message, offerType, offerExpiry }: {
      amount: number; message: string; offerType: "offer" | "counter_offer"; offerExpiry: string;
    }) => {
      if (!amount || amount <= 0) throw new Error("Invalid amount");
      const isCounter = offerType === "counter_offer";
      const expiresAt = computeExpiryDate(offerExpiry);
      const dealD = deal as any;
      const newRound = (dealD?.negotiation_round || 0) + 1;
      const updateData: any = isCounter
        ? { counter_offer_amount: amount, status: "counter_offer", offer_expires_at: expiresAt, negotiation_round: newRound }
        : { current_offer_amount: amount, status: "offer_sent", offer_expires_at: expiresAt, negotiation_round: newRound };
      const { error } = await supabase.from("deal_rooms").update(updateData).eq("id", deal!.id);
      if (error) throw error;
      await supabase.from("deal_events").insert({
        deal_id: deal!.id, event_type: isCounter ? "counter_offer" : "offer",
        actor_id: userId!, actor_role: isOrgMember ? "seller" : "buyer",
        round_number: newRound, expires_at: expiresAt,
        data_json: { amount, message: message || null, expires_at: expiresAt, round: newRound },
      } as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dealQueryKey });
      qc.invalidateQueries({ queryKey: eventsQueryKey });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const acceptDeal = useMutation({
    mutationFn: async () => {
      const dealD = deal as any;
      const accepted = dealD?.counter_offer_amount || dealD?.current_offer_amount;
      const currency = dealD?.current_offer_currency || "EUR";
      const { error } = await supabase.from("deal_rooms")
        .update({ accepted_amount: accepted, status: "accepted" as any, offer_expires_at: null } as any)
        .eq("id", dealD.id);
      if (error) throw error;
      await supabase.from("deal_events").insert({
        deal_id: dealD.id, event_type: "status_change", actor_id: userId!,
        data_json: { action: "accepted", accepted_amount: accepted },
      } as any);
      if (accepted && accepted > 0 && isOrgMember) {
        try {
          const { data: buyerProfile } = await supabase.from("profiles").select("email, name").eq("id", dealD.buyer_id).single();
          if (buyerProfile?.email) {
            await createPaymentRequest({
              orgId: targetOrgId, senderId: userId!, recipientEmail: buyerProfile.email,
              recipientName: buyerProfile.name || "Customer", amount: accepted, currency,
              description: `Payment for "${dealD.context_title || "deal"}"`,
              contextType: "deal", contextId: dealD.id,
            });
            await supabase.from("deal_rooms").update({ status: "payment_pending" as any } as any).eq("id", dealD.id);
            await supabase.from("deal_events").insert({
              deal_id: dealD.id, event_type: "payment", actor_id: userId!,
              data_json: { action: "payment_request_sent", amount: accepted, currency },
            } as any);
          }
        } catch (e) { console.error("[DealRoom] auto-payment failed:", e); }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dealQueryKey });
      qc.invalidateQueries({ queryKey: eventsQueryKey });
      toast.success("Deal accepted! Payment request sent.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const cancelDeal = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("deal_rooms").update({ status: "cancelled" as any } as any).eq("id", deal!.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: dealQueryKey }); toast.success("Deal cancelled"); },
    onError: (e: any) => toast.error(e.message),
  });

  const uploadDocument = useMutation({
    mutationFn: async (docFile: File) => {
      if (!deal) throw new Error("No deal");
      const path = `deals/${deal.id}/${Date.now()}-${docFile.name}`;
      const buckets = ["chat-media", "property-photos"];
      let finalUrl: string | null = null;
      for (const bucket of buckets) {
        const { error } = await supabase.storage.from(bucket).upload(path, docFile, { upsert: false });
        if (error) continue;
        const { data: signedData } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365);
        finalUrl = signedData?.signedUrl || null;
        break;
      }
      if (!finalUrl) throw new Error("Upload failed");
      await supabase.from("deal_events").insert({
        deal_id: deal.id, event_type: "document", actor_id: userId!,
        actor_role: isOrgMember ? "seller" : "buyer",
        data_json: { name: docFile.name, url: finalUrl, size: docFile.size },
      } as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: eventsQueryKey });
      toast.success("Document shared");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const scheduleVisit = useMutation({
    mutationFn: async ({ date, note }: { date: string; note: string }) => {
      if (!date || !deal) throw new Error("Select a date");
      await supabase.from("deal_events").insert({
        deal_id: deal.id, event_type: "visit_scheduled", actor_id: userId!,
        actor_role: isOrgMember ? "seller" : "buyer",
        data_json: { date, note: note || null },
      } as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: eventsQueryKey });
      toast.success("Visit scheduled");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const generatePaymentLink = useMutation({
    mutationFn: async () => {
      if (!deal) throw new Error("No deal");
      const { data, error } = await supabase.functions.invoke("orbit-payment", {
        body: { action: "deal_checkout", deal_id: deal.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: dealQueryKey });
      qc.invalidateQueries({ queryKey: eventsQueryKey });
      if (data?.url) { window.open(data.url, "_blank"); toast.success("Payment page opened"); }
    },
    onError: (e: any) => toast.error(e.message),
  });

  const verifyPayment = useMutation({
    mutationFn: async () => {
      if (!deal) throw new Error("No deal");
      const { data, error } = await supabase.functions.invoke("orbit-payment", {
        body: { action: "deal_verify_payment", deal_id: deal.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: dealQueryKey });
      qc.invalidateQueries({ queryKey: eventsQueryKey });
      if (data?.paid) toast.success("Payment confirmed! Deal is now confirmed.");
      else toast.info("Payment not yet received.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { createDeal, sendOffer, acceptDeal, cancelDeal, uploadDocument, scheduleVisit, generatePaymentLink, verifyPayment };
}
