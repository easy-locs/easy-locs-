/**
 * useDealRoomActions — All Deal Room mutations extracted from DealRoomPanel.
 * Delegates to deals.repository.ts (single source of truth).
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as dealRepo from "@/repositories/deals.repository";
import { createPaymentRequest } from "@/lib/shared/payment-request";
import { toast } from "sonner";

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
  const invalidate = () => { qc.invalidateQueries({ queryKey: dealQueryKey }); qc.invalidateQueries({ queryKey: eventsQueryKey }); };

  const createDeal = useMutation({
    mutationFn: () => {
      if (!userId) throw new Error("User not authenticated");
      return dealRepo.createDealWithEvent({
        orgId: targetOrgId, buyerId: userId, contextType, contextId, contextTitle, threadId,
      });
    },
    onSuccess: () => { invalidate(); toast.success("Deal Room created"); },
    onError: (e: any) => { console.error("[Deal]", e.message); toast.error("Something went wrong. Please try again."); },
  });

  const sendOffer = useMutation({
    mutationFn: ({ amount, message, offerType, offerExpiry }: {
      amount: number; message: string; offerType: "offer" | "counter_offer"; offerExpiry: string;
    }) => {
      if (!userId || !deal?.id) throw new Error("Missing deal or user");
      return dealRepo.sendDealOffer({
        dealId: deal.id, amount, message, isCounter: offerType === "counter_offer",
        expiry: offerExpiry, currentRound: deal?.negotiation_round || 0,
        actorId: userId, actorRole: isOrgMember ? "seller" : "buyer",
      });
    },
    onSuccess: () => invalidate(),
    onError: (e: any) => { console.error("[Deal]", e.message); toast.error("Something went wrong. Please try again."); },
  });

  const acceptDeal = useMutation({
    mutationFn: () => {
      if (!userId) throw new Error("User not authenticated");
      return dealRepo.acceptDealAndPay({
        deal, actorId: userId, isOrgMember: !!isOrgMember,
        targetOrgId, createPaymentRequest,
      });
    },
    onSuccess: () => { invalidate(); toast.success("Deal accepted! Payment request sent."); },
    onError: (e: any) => { console.error("[Deal]", e.message); toast.error("Something went wrong. Please try again."); },
  });

  const cancelDeal = useMutation({
    mutationFn: () => {
      if (!deal?.id) throw new Error("No deal to cancel");
      return dealRepo.cancelDealRoom(deal.id);
    },
    onSuccess: () => { invalidate(); toast.success("Deal cancelled"); },
    onError: (e: any) => { console.error("[Deal]", e.message); toast.error("Something went wrong. Please try again."); },
  });

  const uploadDocument = useMutation({
    mutationFn: async (docFile: File) => {
      if (!deal) throw new Error("No deal");
      const url = await dealRepo.uploadDealDocument(deal.id, docFile);
      if (!userId) throw new Error("User not authenticated");
      await dealRepo.insertDealEvent({
        deal_id: deal.id, event_type: "document", actor_id: userId,
        actor_role: isOrgMember ? "seller" : "buyer",
        data_json: { name: docFile.name, url, size: docFile.size },
      });
    },
    onSuccess: () => { invalidate(); toast.success("Document shared"); },
    onError: (e: any) => { console.error("[Deal]", e.message); toast.error("Something went wrong. Please try again."); },
  });

  const scheduleVisit = useMutation({
    mutationFn: ({ date, note }: { date: string; note: string }) => {
      if (!deal) throw new Error("Select a date");
      return dealRepo.scheduleDealVisit(deal.id, userId, isOrgMember ? "seller" : "buyer", date, note);
    },
    onSuccess: () => { invalidate(); toast.success("Visit scheduled"); },
    onError: (e: any) => { console.error("[Deal]", e.message); toast.error("Something went wrong. Please try again."); },
  });

  const generatePaymentLink = useMutation({
    mutationFn: () => {
      if (!deal) throw new Error("No deal");
      return dealRepo.invokeDealPayment("deal_checkout", deal.id);
    },
    onSuccess: (data) => { invalidate(); if (data?.url) { window.open(data.url, "_blank"); toast.success("Payment page opened"); } },
    onError: (e: any) => { console.error("[Deal]", e.message); toast.error("Something went wrong. Please try again."); },
  });

  const verifyPayment = useMutation({
    mutationFn: () => {
      if (!deal) throw new Error("No deal");
      return dealRepo.invokeDealPayment("deal_verify_payment", deal.id);
    },
    onSuccess: (data) => { invalidate(); if (data?.paid) toast.success("Payment confirmed!"); else toast.info("Payment not yet received."); },
    onError: (e: any) => { console.error("[Deal]", e.message); toast.error("Something went wrong. Please try again."); },
  });

  return { createDeal, sendOffer, acceptDeal, cancelDeal, uploadDocument, scheduleVisit, generatePaymentLink, verifyPayment };
}
