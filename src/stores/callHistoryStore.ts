import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

export type CallLog = {
  id: string;
  conversation_id: string;
  session_id: string | null;
  caller_orbit_id: string;
  receiver_orbit_id: string;
  call_type: "audio" | "video";
  direction: "outgoing" | "incoming";
  status: "missed" | "answered" | "rejected" | "ended" | "cancelled";
  started_at: string | null;
  answered_at: string | null;
  ended_at: string | null;
  duration_sec: number;
  created_at: string;
};

type CallHistoryStore = {
  items: CallLog[];
  loading: boolean;
  hydrateConversationCalls: (conversationId: string) => Promise<void>;
  addCallLog: (input: {
    conversationId: string;
    sessionId?: string | null;
    callerOrbitId: string;
    receiverOrbitId: string;
    callType: "audio" | "video";
    direction: "outgoing" | "incoming";
    status: "missed" | "answered" | "rejected" | "ended" | "cancelled";
    startedAt?: string | null;
    answeredAt?: string | null;
    endedAt?: string | null;
    durationSec?: number;
  }) => Promise<void>;
};

export const useCallHistoryStore = create<CallHistoryStore>((set) => ({
  items: [],
  loading: false,

  hydrateConversationCalls: async (conversationId) => {
    set({ loading: true });
    const { data, error } = await supabase
      .from("call_logs")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[CallHistory] hydrate error", error);
      set({ loading: false });
      return;
    }

    set((state) => ({
      items: [
        ...(data as unknown as CallLog[]),
        ...state.items.filter((x) => x.conversation_id !== conversationId),
      ],
      loading: false,
    }));
  },

  addCallLog: async (input) => {
    const row = {
      id: `calllog_${Math.random().toString(36).slice(2, 11)}`,
      conversation_id: input.conversationId,
      session_id: input.sessionId ?? null,
      caller_orbit_id: input.callerOrbitId,
      receiver_orbit_id: input.receiverOrbitId,
      call_type: input.callType,
      direction: input.direction,
      status: input.status,
      started_at: input.startedAt ?? null,
      answered_at: input.answeredAt ?? null,
      ended_at: input.endedAt ?? null,
      duration_sec: input.durationSec ?? 0,
    };

    const { data, error } = await supabase
      .from("call_logs")
      .insert(row as any)
      .select()
      .single();

    if (error) {
      console.error("[CallHistory] insert error", error);
      return;
    }

    set((state) => ({
      items: [data as unknown as CallLog, ...state.items],
    }));
  },
}));
