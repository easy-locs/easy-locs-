import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  fetchLatestDecision as fetchDecisionFromDb,
  fetchRecentServerEvents,
} from "@/integrations/supabase/server-brain-types";
import type {
  ServerEventRow,
  OmegaDecisionRow,
} from "@/integrations/supabase/server-brain-types";

export type ServerEvent = ServerEventRow;

export type OmegaDecision = OmegaDecisionRow;

interface ServerEventsState {
  connected: boolean;
  latestEvents: ServerEvent[];
  latestDecision: OmegaDecision | null;
  criticalAlerts: ServerEvent[];
  lastUpdate: number;
}

type ServerEventHandler = (event: ServerEvent) => void;

const MAX_EVENTS_BUFFER = 100;

export function useServerEvents(options?: {
  onCriticalAlert?: ServerEventHandler;
  onDecision?: (decision: OmegaDecision) => void;
  enabled?: boolean;
}) {
  const { onCriticalAlert, onDecision, enabled = true } = options ?? {};

  const [state, setState] = useState<ServerEventsState>({
    connected: false,
    latestEvents: [],
    latestDecision: null,
    criticalAlerts: [],
    lastUpdate: 0,
  });

  const eventsChannelRef = useRef<RealtimeChannel | null>(null);
  const decisionsChannelRef = useRef<RealtimeChannel | null>(null);
  const onCriticalAlertRef = useRef(onCriticalAlert);
  const onDecisionRef = useRef(onDecision);

  onCriticalAlertRef.current = onCriticalAlert;
  onDecisionRef.current = onDecision;

  const fetchLatestDecision = useCallback(async () => {
    const decision = await fetchDecisionFromDb(supabase);
    if (decision) {
      setState((prev) => ({
        ...prev,
        latestDecision: decision,
        lastUpdate: Date.now(),
      }));
    }
  }, []);

  const fetchRecentEvents = useCallback(async () => {
    const events = await fetchRecentServerEvents(supabase);
    const criticals = events.filter(
      (e) => e.level === "critical" || e.level === "error",
    );

    setState((prev) => ({
      ...prev,
      latestEvents: events,
      criticalAlerts: criticals,
      lastUpdate: Date.now(),
    }));
  }, []);

  useEffect(() => {
    if (!enabled) return;

    fetchLatestDecision();
    fetchRecentEvents();

    const eventsChannel = supabase
      .channel("server-events-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "server_events",
        },
        (payload) => {
          const newEvent = payload.new as ServerEvent;

          setState((prev) => {
            const updatedEvents = [newEvent, ...prev.latestEvents].slice(
              0,
              MAX_EVENTS_BUFFER,
            );
            const updatedCriticals =
              newEvent.level === "critical" || newEvent.level === "error"
                ? [newEvent, ...prev.criticalAlerts].slice(0, 20)
                : prev.criticalAlerts;

            return {
              ...prev,
              latestEvents: updatedEvents,
              criticalAlerts: updatedCriticals,
              lastUpdate: Date.now(),
            };
          });

          if (
            (newEvent.level === "critical" || newEvent.level === "error") &&
            onCriticalAlertRef.current
          ) {
            onCriticalAlertRef.current(newEvent);
          }
        },
      )
      .subscribe((status) => {
        setState((prev) => ({
          ...prev,
          connected: status === "SUBSCRIBED",
        }));
      });

    eventsChannelRef.current = eventsChannel;

    const decisionsChannel = supabase
      .channel("omega-decisions-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "omega_decisions",
        },
        (payload) => {
          const decision = payload.new as OmegaDecision;
          setState((prev) => ({
            ...prev,
            latestDecision: decision,
            lastUpdate: Date.now(),
          }));

          if (onDecisionRef.current) {
            onDecisionRef.current(decision);
          }
        },
      )
      .subscribe();

    decisionsChannelRef.current = decisionsChannel;

    return () => {
      if (eventsChannelRef.current) {
        supabase.removeChannel(eventsChannelRef.current);
        eventsChannelRef.current = null;
      }
      if (decisionsChannelRef.current) {
        supabase.removeChannel(decisionsChannelRef.current);
        decisionsChannelRef.current = null;
      }
    };
  }, [enabled, fetchLatestDecision, fetchRecentEvents]);

  return {
    ...state,
    refreshDecision: fetchLatestDecision,
    refreshEvents: fetchRecentEvents,
  };
}
