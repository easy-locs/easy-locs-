/**
 * useDealRoomMutations — All deal room mutations extracted from DealRoomPanel.
 * Delegates to deals.repository.ts (single source of truth).
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as dealRepo from "@/repositories/deals.repository";
import { createPaymentRequest } from "@/lib/shared/payment-request";
import { toast } from "sonner";

interface UseDealRoomMutationsProps {
  deal: any;
  userId: string | undefined;
  contextType: string;
  contextId: string;
  contextTitle?: string;
  targetOrgId: string;
  threadId?: string;
  isOrgMember?: boolean;
}

export function useDealRoomMutations({
  deal, userId, contextType, contextId, contextTitle, targetOrgId, threadId, isOrgMember,
}: UseDealRoomMutationsProps) {
  const qc = useQueryClient();
  const invalidateDeal = () => {
    qc.invalidateQueries({ queryKey: ["deal_room_context", contextType, contextId] });
    qc.invalidateQueries({ queryKey: ["deal_events"] });
  };

  const createDeal = useMutation({
    mutationFn: () => dealRepo.createDealWithEvent({
      orgId: targetOrgId, buyerId: userId!, contextType, contextId, contextTitle, threadId,
    }),
    onSuccess: () => { invalidateDeal(); toast.success("Deal Room created"); },
    onError: (e: any) => toast.error(e.message),
  });

  const sendOffer = useMutation({
    mutationFn: ({ amount, message, offerType, expiry }: {
      amount: number; message: string; offerType: "offer" | "counter_offer"; expiry: string;
    }) => dealRepo.sendDealOffer({
      dealId: deal!.id, amount, message, isCounter: offerType === "counter_offer",
      expiry, currentRound: deal?.negotiation_round || 0,
      actorId: userId!, actorRole: isOrgMember ? "seller" : "buyer",
    }),
    onSuccess: () => { invalidateDeal(); toast.success("Offer sent"); },
    onError: (e: any) => toast.error(e.message),
  });

  const acceptDeal = useMutation({
    mutationFn: () => dealRepo.acceptDealAndPay({
      deal, actorId: userId!, isOrgMember: !!isOrgMember,
      targetOrgId, createPaymentRequest,
    }),
    onSuccess: () => { invalidateDeal(); toast.success("Deal accepted! Payment request sent."); },
    onError: (e: any) => toast.error(e.message),
  });

  const cancelDeal = useMutation({
    mutationFn: () => dealRepo.cancelDealRoom(deal!.id),
    onSuccess: () => { invalidateDeal(); toast.success("Deal cancelled"); },
    onError: (e: any) => toast.error(e.message),
  });

  const uploadDocument = useMutation({
    mutationFn: async (docFile: File) => {
      if (!docFile || !deal) throw new Error("No file selected");
      const url = await dealRepo.uploadDealDocument(deal.id, docFile);
      await dealRepo.insertDealEvent({
        deal_id: deal.id, event_type: "document", actor_id: userId!,
        actor_role: isOrgMember ? "seller" : "buyer",
        data_json: { name: docFile.name, url, size: docFile.size },
      });
    },
    onSuccess: () => { invalidateDeal(); toast.success("Document shared"); },
    onError: (e: any) => toast.error(e.message),
  });

  const scheduleVisit = useMutation({
    mutationFn: ({ date, note }: { date: string; note: string }) => {
      if (!date || !deal) throw new Error("Select a date");
      return dealRepo.scheduleDealVisit(deal.id, userId!, isOrgMember ? "seller" : "buyer", date, note);
    },
    onSuccess: () => { invalidateDeal(); toast.success("Visit scheduled"); },
    onError: (e: any) => toast.error(e.message),
  });

  const generatePaymentLink = useMutation({
    mutationFn: () => {
      if (!deal) throw new Error("No deal");
      return dealRepo.invokeDealPayment("deal_checkout", deal.id);
    },
    onSuccess: (data) => { invalidateDeal(); if (data?.url) { window.open(data.url, "_blank"); toast.success("Payment page opened"); } },
    onError: (e: any) => toast.error(e.message),
  });

  const verifyPayment = useMutation({
    mutationFn: () => {
      if (!deal) throw new Error("No deal");
      return dealRepo.invokeDealPayment("deal_verify_payment", deal.id);
    },
    onSuccess: (data) => { invalidateDeal(); if (data?.paid) toast.success("Payment confirmed!"); else toast.info("Payment not yet received."); },
    onError: (e: any) => toast.error(e.message),
  });

  return { createDeal, sendOffer, acceptDeal, cancelDeal, uploadDocument, scheduleVisit, generatePaymentLink, verifyPayment };
}
