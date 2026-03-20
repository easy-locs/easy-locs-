import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { useOrbitStore } from "@/stores/orbitStore";
import { useCallHistoryStore } from "@/stores/callHistoryStore";
import { platformBus } from "@/app/events/platform-bus";

type CallSession = {
  id: string;
  conversation_id: string | null;
  caller_orbit_id: string;
  receiver_orbit_id: string;
  call_type: string;
  status: string;
  started_at: string | null;
  answered_at: string | null;
  ended_at: string | null;
  created_at: string | null;
};

type CallStore = {
  current: CallSession | null;
  incoming: CallSession | null;
  mode: "idle" | "ringing" | "connecting" | "active" | "ended";
  type: "audio" | "video" | null;
  peerOrbitId: string | null;
  localMicEnabled: boolean;
  localCamEnabled: boolean;

  createCall: (receiverOrbitId: string, callType: "audio" | "video", conversationId?: string) => Promise<void>;
  startCall: (peerOrbitId: string, type: "audio" | "video") => void;
  setConnecting: () => void;
  setActive: () => void;
  acceptCall: (sessionId: string, conversationId?: string) => Promise<void>;
  rejectCall: (sessionId: string, conversationId?: string) => Promise<void>;
  endCall: (sessionId?: string, conversationId?: string, durationSec?: number) => Promise<void>;
  toggleMic: () => void;
  toggleCam: () => void;
};

export const useCallStore = create<CallStore>((set, get) => ({
  current: null,
  incoming: null,
  mode: "idle",
  type: null,
  peerOrbitId: null,
  localMicEnabled: true,
  localCamEnabled: true,

  startCall: (peerOrbitId, type) => {
    set({ mode: "ringing", type, peerOrbitId, localMicEnabled: true, localCamEnabled: type === "video" });
    platformBus.emit({ type: "call.started", payload: { peerOrbitId, mode: type } });
  },

  setConnecting: () => set({ mode: "connecting" }),
  setActive: () => set({ mode: "active" }),

  createCall: async (receiverOrbitId, callType, conversationId) => {
    const orbit = useOrbitStore.getState().profile;
    if (!orbit) return;

    const session: any = {
      id: `call_${Math.random().toString(36).slice(2, 11)}`,
      conversation_id: conversationId ?? null,
      caller_orbit_id: orbit.orbitId,
      receiver_orbit_id: receiverOrbitId,
      call_type: callType,
      status: "ringing",
      started_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Legacy compat columns
      initiator_id: orbit.orbitId,
      recipient_id: receiverOrbitId,
    };

    const { error } = await (supabase as any).from("call_sessions").insert(session);
    if (error) {
      console.error("createCall error", error);
      return;
    }

    set({ current: session, mode: "ringing" });
    platformBus.emit({ type: "call.started", payload: { peerOrbitId: receiverOrbitId, mode: callType } });
  },

  acceptCall: async (sessionId, conversationId) => {
    const incoming = get().incoming;
    if (!incoming) return;

    const now = new Date().toISOString();

    await (supabase as any)
      .from("call_sessions")
      .update({ status: "accepted", answered_at: now, updated_at: now })
      .eq("id", sessionId);

    if (conversationId || incoming.conversation_id) {
      await useCallHistoryStore.getState().addCallLog({
        conversationId: conversationId ?? incoming.conversation_id!,
        sessionId,
        callerOrbitId: incoming.caller_orbit_id,
        receiverOrbitId: incoming.receiver_orbit_id,
        callType: (incoming.call_type as "audio" | "video") ?? "audio",
        direction: "incoming",
        status: "answered",
        startedAt: incoming.started_at ?? now,
        answeredAt: now,
      });
    }

    set({
      current: { ...incoming, status: "accepted", answered_at: now },
      incoming: null,
      mode: "active",
    });
  },

  rejectCall: async (sessionId, conversationId) => {
    const incoming = get().incoming;
    if (!incoming) return;

    const now = new Date().toISOString();

    await (supabase as any)
      .from("call_sessions")
      .update({ status: "rejected", ended_at: now, updated_at: now })
      .eq("id", sessionId);

    if (conversationId || incoming.conversation_id) {
      await useCallHistoryStore.getState().addCallLog({
        conversationId: conversationId ?? incoming.conversation_id!,
        sessionId,
        callerOrbitId: incoming.caller_orbit_id,
        receiverOrbitId: incoming.receiver_orbit_id,
        callType: (incoming.call_type as "audio" | "video") ?? "audio",
        direction: "incoming",
        status: "rejected",
        endedAt: now,
      });
    }

    set({ incoming: null, mode: "idle" });
  },

  endCall: async (sessionId, conversationId, durationSec = 0) => {
    const current = get().current;
    const orbit = useOrbitStore.getState().profile;
    if (!current || !orbit) return;

    const now = new Date().toISOString();

    await (supabase as any)
      .from("call_sessions")
      .update({ status: "ended", ended_at: now, updated_at: now })
      .eq("id", sessionId);

    if (conversationId || current.conversation_id) {
      await useCallHistoryStore.getState().addCallLog({
        conversationId: conversationId ?? current.conversation_id!,
        sessionId,
        callerOrbitId: current.caller_orbit_id,
        receiverOrbitId: current.receiver_orbit_id,
        callType: (current.call_type as "audio" | "video") ?? "audio",
        direction: current.caller_orbit_id === orbit.orbitId ? "outgoing" : "incoming",
        status: "ended",
        startedAt: current.started_at ?? null,
        endedAt: now,
        durationSec,
      });
    }

    set({ current: null, mode: "ended" });
    platformBus.emit({ type: "call.ended", payload: { peerOrbitId: current.receiver_orbit_id } });

    // Reset to idle after brief delay
    setTimeout(() => set({ mode: "idle" }), 1500);
  },

  toggleMic: () => set((s) => ({ localMicEnabled: !s.localMicEnabled })),
  toggleCam: () => set((s) => ({ localCamEnabled: !s.localCamEnabled })),
}));
