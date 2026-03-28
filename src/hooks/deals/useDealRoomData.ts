/**
 * useDealRoomData — Data fetching + realtime for DealRoomPanel.
 * Single responsibility: deal room queries + realtime sync.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { isPast, formatDistanceToNow } from "date-fns";

export type DealStatus =
  | "inquiry" | "negotiation" | "offer_sent" | "counter_offer"
  | "accepted" | "payment_pending" | "confirmed" | "completed" | "cancelled";

export function useDealRoomData(contextType: string, contextId: string) {
  useRealtimeSubscription({
    table: "deal_rooms",
    channelName: `deal-panel-${contextId}`,
    filter: `context_id=eq.${contextId}`,
    queryKeys: [["deal_room_context", contextType, contextId]],
    enabled: !!contextId,
  });

  useRealtimeSubscription({
    table: "deal_events",
    channelName: `deal-events-panel-${contextId}`,
    queryKeys: [["deal_events"]],
    enabled: !!contextId,
  });

  const { data: deal, isLoading: dealLoading } = useQuery({
    queryKey: ["deal_room_context", contextType, contextId],
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_rooms")
        .select("*")
        .eq("context_type", contextType)
        .eq("context_id", contextId)
        .neq("status", "cancelled" as any)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!contextId,
  });

  const { data: events = [] } = useQuery({
    queryKey: ["deal_events", deal?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_events")
        .select("*")
        .eq("deal_id", deal!.id)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!deal?.id,
  });

  const negotiationHistory = useMemo(() => {
    return (events as any[]).filter(
      (ev: any) => ev.event_type === "offer" || ev.event_type === "counter_offer"
    );
  }, [events]);

  const dealData = deal as any;
  const dealStatus = dealData?.status as DealStatus | undefined;

  const offerExpiresAt = dealData?.offer_expires_at ? new Date(dealData.offer_expires_at) : null;
  const isOfferExpired = offerExpiresAt ? isPast(offerExpiresAt) : false;
  const expiryLabel = offerExpiresAt
    ? isOfferExpired
      ? "Expired"
      : `Expires ${formatDistanceToNow(offerExpiresAt, { addSuffix: true })}`
    : null;

  const isTerminal = ["completed", "cancelled"].includes(dealStatus || "");
  const canSendOffer = !isTerminal && dealStatus !== "accepted" && dealStatus !== "payment_pending" && dealStatus !== "confirmed";
  const canAccept = !isTerminal && (dealStatus === "offer_sent" || dealStatus === "counter_offer") && !isOfferExpired;
  const canCancel = !isTerminal;

  return {
    deal, dealData, dealLoading, events, negotiationHistory,
    dealStatus, offerExpiresAt, isOfferExpired, expiryLabel,
    isTerminal, canSendOffer, canAccept, canCancel,
  };
}
