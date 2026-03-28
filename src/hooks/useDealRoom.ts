/**
 * useDealRoom — Smart Deal Room hook for the unified communication hub.
 */
import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
import { toast } from "sonner";
import * as dealRepo from "@/repositories/deal.repository";

export type DealStatus =
  | "inquiry" | "negotiation" | "offer_sent" | "counter_offer"
  | "accepted" | "payment_pending" | "confirmed" | "completed" | "cancelled";

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  inquiry: "Inquiry", negotiation: "Negotiation", offer_sent: "Offer Sent",
  counter_offer: "Counter Offer", accepted: "Accepted", payment_pending: "Payment Pending",
  confirmed: "Confirmed", completed: "Completed", cancelled: "Cancelled",
};

export const DEAL_STATUS_COLORS: Record<DealStatus, string> = {
  inquiry: "bg-blue-500/10 text-blue-600", negotiation: "bg-amber-500/10 text-amber-600",
  offer_sent: "bg-purple-500/10 text-purple-600", counter_offer: "bg-orange-500/10 text-orange-600",
  accepted: "bg-green-500/10 text-green-600", payment_pending: "bg-yellow-500/10 text-yellow-600",
  confirmed: "bg-emerald-500/10 text-emerald-700", completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

const DEAL_QUERY_KEYS = [["deal_rooms"], ["deal_events"], ["deal_room_detail"]];

export function useGetOrCreateDealRoom() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ contextType, contextId, contextTitle, targetOrgId, threadId }: { contextType: string; contextId: string; contextTitle?: string; targetOrgId: string; threadId?: string }) => {
      const existing = await dealRepo.findExistingDealRoom(contextType, contextId, user!.id);
      if (existing) return existing;
      const data = await dealRepo.createDealRoom({ org_id: targetOrgId, buyer_id: user!.id, context_type: contextType, context_id: contextId, context_title: contextTitle || "", thread_id: threadId || null, status: "inquiry" });
      await dealRepo.insertDealEvent({ deal_id: data.id, event_type: "status_change", actor_id: user!.id, actor_role: "buyer", data_json: { new_status: "inquiry", context_title: contextTitle } });
      return data;
    },
    onSuccess: () => { DEAL_QUERY_KEYS.forEach(k => queryClient.invalidateQueries({ queryKey: k })); },
    onError: (err: any) => toast.error(err.message || "Failed to create deal room"),
  });
}

export function useDealRoom(dealId?: string) {
  return useQuery({
    queryKey: ["deal_room_detail", dealId],
    queryFn: () => dealRepo.fetchDealRoom(dealId!),
    enabled: !!dealId,
  });
}

export function useDealEvents(dealId?: string) {
  return useQuery({
    queryKey: ["deal_events", dealId],
    queryFn: () => dealRepo.fetchDealEvents(dealId!),
    enabled: !!dealId,
  });
}

export function useMyDeals() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["deal_rooms", "my", user?.id],
    queryFn: () => dealRepo.fetchMyDeals(user!.id),
    enabled: !!user?.id,
  });
}

export function useOrgDeals(orgId?: string) {
  return useQuery({
    queryKey: ["deal_rooms", "org", orgId],
    queryFn: () => dealRepo.fetchOrgDeals(orgId!),
    enabled: !!orgId,
  });
}

export function useSendOffer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ dealId, amount, currency, message }: { dealId: string; amount: number; currency?: string; message?: string }) => {
      await dealRepo.updateDealRoom(dealId, { current_offer_amount: amount, current_offer_currency: currency || "EUR", status: "offer_sent" });
      await dealRepo.insertDealEvent({ deal_id: dealId, event_type: "offer", actor_id: user!.id, data_json: { amount, currency: currency || "EUR", message } });
    },
    onSuccess: () => { DEAL_QUERY_KEYS.forEach(k => queryClient.invalidateQueries({ queryKey: k })); toast.success("Offer sent"); },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useSendCounterOffer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ dealId, amount, currency, message }: { dealId: string; amount: number; currency?: string; message?: string }) => {
      await dealRepo.updateDealRoom(dealId, { counter_offer_amount: amount, status: "counter_offer" });
      await dealRepo.insertDealEvent({ deal_id: dealId, event_type: "counter_offer", actor_id: user!.id, data_json: { amount, currency: currency || "EUR", message } });
    },
    onSuccess: () => { DEAL_QUERY_KEYS.forEach(k => queryClient.invalidateQueries({ queryKey: k })); toast.success("Counter-offer sent"); },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useAcceptDeal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ dealId, acceptedAmount }: { dealId: string; acceptedAmount: number }) => {
      await dealRepo.updateDealRoom(dealId, { accepted_amount: acceptedAmount, status: "accepted" });
      await dealRepo.insertDealEvent({ deal_id: dealId, event_type: "status_change", actor_id: user!.id, data_json: { action: "accepted", accepted_amount: acceptedAmount } });
    },
    onSuccess: () => { DEAL_QUERY_KEYS.forEach(k => queryClient.invalidateQueries({ queryKey: k })); toast.success("Deal accepted!"); },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useUpdateDealStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ dealId, status }: { dealId: string; status: DealStatus }) => {
      await dealRepo.updateDealRoom(dealId, { status });
    },
    onSuccess: (_, { status }) => { DEAL_QUERY_KEYS.forEach(k => queryClient.invalidateQueries({ queryKey: k })); toast.success(`Deal ${DEAL_STATUS_LABELS[status].toLowerCase()}`); },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useDealRealtimeSync(dealId?: string) {
  useRealtimeSubscription({ table: "deal_rooms", channelName: `deal-sync-${dealId || "all"}`, filter: dealId ? `id=eq.${dealId}` : undefined, queryKeys: DEAL_QUERY_KEYS, enabled: true });
  useRealtimeSubscription({ table: "deal_events", channelName: `deal-events-${dealId || "all"}`, filter: dealId ? `deal_id=eq.${dealId}` : undefined, queryKeys: [["deal_events", dealId]], enabled: !!dealId });
}

export function useDealRoomSync() {
  const { user } = useAuth();
  useDealRealtimeSync();
  const createDeal = useGetOrCreateDealRoom();
  const sendOffer = useSendOffer();
  const sendCounterOffer = useSendCounterOffer();
  const acceptDeal = useAcceptDeal();
  const updateStatus = useUpdateDealStatus();
  return {
    createDeal: useCallback((params: Parameters<typeof createDeal.mutate>[0]) => createDeal.mutate(params), [createDeal]),
    sendOffer: useCallback((params: Parameters<typeof sendOffer.mutate>[0]) => sendOffer.mutate(params), [sendOffer]),
    sendCounterOffer: useCallback((params: Parameters<typeof sendCounterOffer.mutate>[0]) => sendCounterOffer.mutate(params), [sendCounterOffer]),
    acceptDeal: useCallback((params: Parameters<typeof acceptDeal.mutate>[0]) => acceptDeal.mutate(params), [acceptDeal]),
    updateStatus: useCallback((params: Parameters<typeof updateStatus.mutate>[0]) => updateStatus.mutate(params), [updateStatus]),
    isLoading: createDeal.isPending || sendOffer.isPending || sendCounterOffer.isPending || acceptDeal.isPending || updateStatus.isPending,
  };
}
