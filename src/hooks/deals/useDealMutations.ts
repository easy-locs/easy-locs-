/**
 * useDealMutations — Atomic: all deal room write operations.
 * Uses deals.repository.ts as single source of truth.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as dealRepo from "@/repositories/deals.repository";
import { createPaymentRequest } from "@/lib/shared/payment-request";
import { toast } from "sonner";

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
    mutationFn: () => dealRepo.createDealWithEvent({
      orgId: deps.targetOrgId, buyerId: deps.userId, contextType: deps.contextType,
      contextId: deps.contextId, contextTitle: deps.contextTitle, threadId: deps.threadId,
    }),
    onSuccess: () => { invalidate(); toast.success("Deal Room created"); },
    onError: (e: any) => toast.error(e.message),
  });

  const sendOffer = useMutation({
    mutationFn: (params: { amount: number; message: string; type: "offer" | "counter_offer"; expiry: string; deal: any }) =>
      dealRepo.sendDealOffer({
        dealId: params.deal.id, amount: params.amount, message: params.message,
        isCounter: params.type === "counter_offer", expiry: params.expiry,
        currentRound: params.deal?.negotiation_round || 0,
        actorId: deps.userId, actorRole: deps.isOrgMember ? "seller" : "buyer",
      }),
    onSuccess: () => { invalidate(); toast.success("Offer sent"); },
    onError: (e: any) => toast.error(e.message),
  });

  const acceptDeal = useMutation({
    mutationFn: (deal: any) => dealRepo.acceptDealAndPay({
      deal, actorId: deps.userId, isOrgMember: !!deps.isOrgMember,
      targetOrgId: deps.targetOrgId, createPaymentRequest,
    }),
    onSuccess: () => { invalidate(); toast.success("Deal accepted! Payment request sent."); },
    onError: (e: any) => toast.error(e.message),
  });

  const cancelDeal = useMutation({
    mutationFn: async () => {
      if (!dealId) throw new Error("No deal");
      await dealRepo.cancelDealRoom(dealId);
    },
    onSuccess: () => { invalidate(); toast.success("Deal cancelled"); },
    onError: (e: any) => toast.error(e.message),
  });

  const uploadDocument = useMutation({
    mutationFn: async (file: File) => {
      if (!dealId) throw new Error("No deal");
      const url = await dealRepo.uploadDealDocument(dealId, file);
      await dealRepo.insertDealEvent({
        deal_id: dealId, event_type: "document", actor_id: deps.userId,
        actor_role: deps.isOrgMember ? "seller" : "buyer",
        data_json: { name: file.name, url, size: file.size },
      });
    },
    onSuccess: () => { invalidate(); toast.success("Document shared"); },
    onError: (e: any) => toast.error(e.message),
  });

  const scheduleVisit = useMutation({
    mutationFn: (params: { date: string; note: string }) => {
      if (!dealId) throw new Error("No deal");
      return dealRepo.scheduleDealVisit(dealId, deps.userId, deps.isOrgMember ? "seller" : "buyer", params.date, params.note);
    },
    onSuccess: () => { invalidate(); toast.success("Visit scheduled"); },
    onError: (e: any) => toast.error(e.message),
  });

  const generatePaymentLink = useMutation({
    mutationFn: () => {
      if (!dealId) throw new Error("No deal");
      return dealRepo.invokeDealPayment("deal_checkout", dealId);
    },
    onSuccess: (data) => { invalidate(); if (data?.url) { window.open(data.url, "_blank"); toast.success("Payment page opened"); } },
    onError: (e: any) => toast.error(e.message),
  });

  const verifyPayment = useMutation({
    mutationFn: () => {
      if (!dealId) throw new Error("No deal");
      return dealRepo.invokeDealPayment("deal_verify_payment", dealId);
    },
    onSuccess: (data) => { invalidate(); toast.success(data?.paid ? "Payment confirmed!" : "Payment not yet received."); },
    onError: (e: any) => toast.error(e.message),
  });

  return { createDeal, sendOffer, acceptDeal, cancelDeal, uploadDocument, scheduleVisit, generatePaymentLink, verifyPayment };
}
