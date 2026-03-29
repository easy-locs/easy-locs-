/**
 * useRealtimeSubscription — generic hook for Supabase Realtime postgres_changes.
 * Invalidates React Query cache on changes for seamless live updates.
 * Layer 3.3: Realtime subscriptions.
 */
import { useEffect } from "react";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { useQueryClient } from "@tanstack/react-query";

interface RealtimeOptions {
  /** Table name in public schema */
  table: string;
  /** Realtime channel name (must be unique per subscription) */
  channelName: string;
  /** Postgres filter e.g. "org_id=eq.abc-123" */
  filter?: string;
  /** Events to listen for */
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
  /** React Query keys to invalidate on change */
  queryKeys?: string[][];
  /** Optional direct callback instead of/alongside query invalidation */
  onPayload?: (payload: any) => void;
  /** Whether the subscription is active (e.g. skip if no orgId yet) */
  enabled?: boolean;
}

export function useRealtimeSubscription({
  table,
  channelName,
  filter,
  event = "*",
  queryKeys,
  onPayload,
  enabled = true,
}: RealtimeOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const channelConfig: any = {
      event,
      schema: "public",
      table,
    };
    if (filter) channelConfig.filter = filter;

    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", channelConfig, (payload) => {
        // Invalidate specified query keys
        if (queryKeys?.length) {
          queryKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
        }
        // Fire callback
        onPayload?.(payload);
      })
      .subscribe();

    return () => {
      removeRealtimeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, channelName, filter, event, enabled]);
}
