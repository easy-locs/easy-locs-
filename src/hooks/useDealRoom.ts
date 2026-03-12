/**
 * useDealRoom — Smart Deal Room hook for the unified communication hub.
 * Manages deal lifecycle, offers, counter-offers, and auto-sync with conversation threads.
 */
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
import { toast } from "sonner";

export type DealStatus =
  | "inquiry" | "negotiation" | "offer_sent" | "counter_offer"
  | "accepted" | "payment_pending" | "confirmed" | "completed" | "cancelled";

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  inquiry: "Inquiry",
  negotiation: "Negotiation",
  offer_sent: "Offer Sent",
  counter_offer: "Counter Offer",
  accepted: "Accepted",
  payment_pending: "Payment Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const DEAL_STATUS_COLORS: Record<DealStatus, string> = {
  inquiry: "bg-blue-500/10 text-blue-600",
  negotiation: "bg-amber-500/10 text-amber-600",
  offer_sent: "bg-purple-500/10 text-purple-600",
  counter_offer: "bg-orange-500/10 text-orange-600",
  accepted: "bg-green-500/10 text-green-600",
  payment_pending: "bg-yellow-500/10 text-yellow-600",
  confirmed: "bg-emerald-500/10 text-emerald-700",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

const DEAL_QUERY_KEYS = [
  ["deal_rooms"],
  ["deal_events"],
  ["deal_room_detail"],
];

/* ─── Get or create deal room for a context ─── */
export function useGetOrCreateDealRoom() {
  const { user, orgId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contextType,
      contextId,
      contextTitle,
      targetOrgId,
      threadId,
    }: {
      contextType: string;
      contextId: string;
      contextTitle?: string;
      targetOrgId: string;
      threadId?: string;
    }) => {
      // Check if deal room already exists
      const { data: existing } = await supabase
        .from("deal_rooms")
        .select("*")
        .eq("context_type", contextType)
        .eq("context_id", contextId)
        .eq("buyer_id", user!.id)
        .neq("status", "cancelled" as any)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) return existing;

      // Create new deal room
      const { data, error } = await supabase
        .from("deal_rooms")
        .insert({
          org_id: targetOrgId,
          buyer_id: user!.id,
          context_type: contextType,
          context_id: contextId,
          context_title: contextTitle || "",
          thread_id: threadId || null,
          status: "inquiry" as any,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Record initial event
      await supabase.from("deal_events").insert({
        deal_id: data.id,
        event_type: "status_change",
        actor_id: user!.id,
        actor_role: "buyer",
        data_json: { new_status: "inquiry", context_title: contextTitle },
      } as any);

      return data;
    },
    onSuccess: () => {
      DEAL_QUERY_KEYS.forEach(k => queryClient.invalidateQueries({ queryKey: k }));
    },
    onError: (err: any) => toast.error(err.message || "Failed to create deal room"),
  });
}

/* ─── Deal room detail ─── */
export function useDealRoom(dealId?: string) {
  return useQuery({
    queryKey: ["deal_room_detail", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_rooms")
        .select("*")
        .eq("id", dealId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!dealId,
  });
}

/* ─── Deal events timeline ─── */
export function useDealEvents(dealId?: string) {
  return useQuery({
    queryKey: ["deal_events", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_events")
        .select("*")
        .eq("deal_id", dealId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!dealId,
  });
}

/* ─── My deals list ─── */
export function useMyDeals() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["deal_rooms", "my", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_rooms")
        .select("*")
        .or(`buyer_id.eq.${user!.id}`)
        .neq("status", "cancelled" as any)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });
}

/* ─── Org deals (seller side) ─── */
export function useOrgDeals(orgId?: string) {
  return useQuery({
    queryKey: ["deal_rooms", "org", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_rooms")
        .select("*")
        .eq("org_id", orgId!)
        .neq("status", "cancelled" as any)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });
}

/* ─── Send offer ─── */
export function useSendOffer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dealId,
      amount,
      currency,
      message,
    }: {
      dealId: string;
      amount: number;
      currency?: string;
      message?: string;
    }) => {
      const { error } = await supabase
        .from("deal_rooms")
        .update({
          current_offer_amount: amount,
          current_offer_currency: currency || "EUR",
          status: "offer_sent" as any,
        } as any)
        .eq("id", dealId);
      if (error) throw error;

      await supabase.from("deal_events").insert({
        deal_id: dealId,
        event_type: "offer",
        actor_id: user!.id,
        data_json: { amount, currency: currency || "EUR", message },
      } as any);
    },
    onSuccess: () => {
      DEAL_QUERY_KEYS.forEach(k => queryClient.invalidateQueries({ queryKey: k }));
      toast.success("Offer sent");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

/* ─── Send counter-offer ─── */
export function useSendCounterOffer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dealId,
      amount,
      currency,
      message,
    }: {
      dealId: string;
      amount: number;
      currency?: string;
      message?: string;
    }) => {
      const { error } = await supabase
        .from("deal_rooms")
        .update({
          counter_offer_amount: amount,
          status: "counter_offer" as any,
        } as any)
        .eq("id", dealId);
      if (error) throw error;

      await supabase.from("deal_events").insert({
        deal_id: dealId,
        event_type: "counter_offer",
        actor_id: user!.id,
        data_json: { amount, currency: currency || "EUR", message },
      } as any);
    },
    onSuccess: () => {
      DEAL_QUERY_KEYS.forEach(k => queryClient.invalidateQueries({ queryKey: k }));
      toast.success("Counter-offer sent");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

/* ─── Accept deal ─── */
export function useAcceptDeal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dealId, acceptedAmount }: { dealId: string; acceptedAmount: number }) => {
      const { error } = await supabase
        .from("deal_rooms")
        .update({
          accepted_amount: acceptedAmount,
          status: "accepted" as any,
        } as any)
        .eq("id", dealId);
      if (error) throw error;

      await supabase.from("deal_events").insert({
        deal_id: dealId,
        event_type: "status_change",
        actor_id: user!.id,
        data_json: { action: "accepted", accepted_amount: acceptedAmount },
      } as any);
    },
    onSuccess: () => {
      DEAL_QUERY_KEYS.forEach(k => queryClient.invalidateQueries({ queryKey: k }));
      toast.success("Deal accepted!");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

/* ─── Update deal status ─── */
export function useUpdateDealStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dealId, status }: { dealId: string; status: DealStatus }) => {
      const { error } = await supabase
        .from("deal_rooms")
        .update({ status: status as any } as any)
        .eq("id", dealId);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      DEAL_QUERY_KEYS.forEach(k => queryClient.invalidateQueries({ queryKey: k }));
      toast.success(`Deal ${DEAL_STATUS_LABELS[status].toLowerCase()}`);
    },
    onError: (err: any) => toast.error(err.message),
  });
}

/* ─── Realtime sync for deals ─── */
export function useDealRealtimeSync(dealId?: string) {
  useRealtimeSubscription({
    table: "deal_rooms",
    channelName: `deal-sync-${dealId || "all"}`,
    filter: dealId ? `id=eq.${dealId}` : undefined,
    queryKeys: DEAL_QUERY_KEYS,
    enabled: true,
  });

  useRealtimeSubscription({
    table: "deal_events",
    channelName: `deal-events-${dealId || "all"}`,
    filter: dealId ? `deal_id=eq.${dealId}` : undefined,
    queryKeys: [["deal_events", dealId]],
    enabled: !!dealId,
  });
}

/* ─── Combined hook for pages ─── */
export function useDealRoomSync() {
  const { user } = useAuth();
  useDealRealtimeSync();

  const createDeal = useGetOrCreateDealRoom();
  const sendOffer = useSendOffer();
  const sendCounterOffer = useSendCounterOffer();
  const acceptDeal = useAcceptDeal();
  const updateStatus = useUpdateDealStatus();

  return {
    createDeal: useCallback(
      (params: Parameters<typeof createDeal.mutate>[0]) => createDeal.mutate(params),
      [createDeal]
    ),
    sendOffer: useCallback(
      (params: Parameters<typeof sendOffer.mutate>[0]) => sendOffer.mutate(params),
      [sendOffer]
    ),
    sendCounterOffer: useCallback(
      (params: Parameters<typeof sendCounterOffer.mutate>[0]) => sendCounterOffer.mutate(params),
      [sendCounterOffer]
    ),
    acceptDeal: useCallback(
      (params: Parameters<typeof acceptDeal.mutate>[0]) => acceptDeal.mutate(params),
      [acceptDeal]
    ),
    updateStatus: useCallback(
      (params: Parameters<typeof updateStatus.mutate>[0]) => updateStatus.mutate(params),
      [updateStatus]
    ),
    isLoading: createDeal.isPending || sendOffer.isPending || sendCounterOffer.isPending || acceptDeal.isPending || updateStatus.isPending,
  };
}
