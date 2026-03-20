import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { useOrbitStore } from "@/stores/orbitStore";
import { useCallHistoryStore } from "@/stores/callHistoryStore";
import { createCallSystemMessage } from "@/lib/chat/createCallSystemMessage";
import { platformBus } from "@/app/events/platform-bus";

type CallType = "audio" | "video";

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
  missedTimer: number | null;
  mode: "idle" | "ringing" | "connecting" | "active" | "ended";
  type: "audio" | "video" | null;
  peerOrbitId: string | null;
  localMicEnabled: boolean;
  localCamEnabled: boolean;

  createCall: (receiverOrbitId: string, callType: CallType, conversationId?: string) => Promise<void>;
  startCall: (peerOrbitId: string, type: CallType) => void;
  setConnecting: () => void;
  setActive: () => void;
  acceptCall: (sessionId: string, conversationId?: string) => Promise<void>;
  rejectCall: (sessionId: string, conversationId?: string) => Promise<void>;
  endCall: (sessionId?: string, conversationId?: string, durationSec?: number) => Promise<void>;
  markMissedCall: (session: CallSession) => Promise<void>;
  startMissedCallTimer: (session: CallSession) => void;
  toggleMic: () => void;
  toggleCam: () => void;
};

export const useCallStore = create<CallStore>((set, get) => ({
  current: null,
  incoming: null,
  missedTimer: null,
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

    const now = new Date().toISOString();
    const session: CallSession = {
      id: `call_${Math.random().toString(36).slice(2, 11)}`,
      conversation_id: conversationId ?? null,
      caller_orbit_id: orbit.orbitId,
      receiver_orbit_id: receiverOrbitId,
      call_type: callType,
      status: "ringing",
      started_at: now,
      answered_at: null,
      ended_at: null,
      created_at: now,
    };

    const { error } = await (supabase as any).from("call_sessions").insert({
      ...session,
      updated_at: now,
      initiator_id: orbit.orbitId,
      recipient_id: receiverOrbitId,
    });
    if (error) {
      console.error("createCall error", error);
      return;
    }

    if (conversationId) {
      await createCallSystemMessage({
        conversationId,
        senderOrbitId: orbit.orbitId,
        body: callType === "video" ? "Outgoing video call" : "Outgoing voice call",
        metadata: { callType, status: "ringing", direction: "outgoing", sessionId: session.id },
      });
    }

    set({ current: session, mode: "ringing" });
    platformBus.emit({ type: "call.started", payload: { peerOrbitId: receiverOrbitId, mode: callType } });
  },

  acceptCall: async (sessionId, conversationId) => {
    const incoming = get().incoming;
    if (!incoming) return;

    const now = new Date().toISOString();

    if (get().missedTimer) {
      clearTimeout(get().missedTimer!);
      set({ missedTimer: null });
    }

    await (supabase as any)
      .from("call_sessions")
      .update({ status: "accepted", answered_at: now, updated_at: now })
      .eq("id", sessionId);

    const finalConversationId = conversationId ?? incoming.conversation_id ?? undefined;

    if (finalConversationId) {
      await useCallHistoryStore.getState().addCallLog({
        conversationId: finalConversationId,
        sessionId,
        callerOrbitId: incoming.caller_orbit_id,
        receiverOrbitId: incoming.receiver_orbit_id,
        callType: (incoming.call_type as CallType) ?? "audio",
        direction: "incoming",
        status: "answered",
        startedAt: incoming.started_at ?? now,
        answeredAt: now,
      });

      await createCallSystemMessage({
        conversationId: finalConversationId,
        senderOrbitId: incoming.caller_orbit_id,
        body: incoming.call_type === "video" ? "Video call answered" : "Voice call answered",
        metadata: { callType: incoming.call_type, status: "answered", direction: "incoming", sessionId },
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

    if (get().missedTimer) {
      clearTimeout(get().missedTimer!);
      set({ missedTimer: null });
    }

    await (supabase as any)
      .from("call_sessions")
      .update({ status: "rejected", ended_at: now, updated_at: now })
      .eq("id", sessionId);

    const finalConversationId = conversationId ?? incoming.conversation_id ?? undefined;

    if (finalConversationId) {
      await useCallHistoryStore.getState().addCallLog({
        conversationId: finalConversationId,
        sessionId,
        callerOrbitId: incoming.caller_orbit_id,
        receiverOrbitId: incoming.receiver_orbit_id,
        callType: (incoming.call_type as CallType) ?? "audio",
        direction: "incoming",
        status: "rejected",
        endedAt: now,
      });

      await createCallSystemMessage({
        conversationId: finalConversationId,
        senderOrbitId: incoming.caller_orbit_id,
        body: incoming.call_type === "video" ? "Video call rejected" : "Voice call rejected",
        metadata: { callType: incoming.call_type, status: "rejected", direction: "incoming", sessionId },
      });
    }

    set({ incoming: null, mode: "idle" });
  },

  markMissedCall: async (session) => {
    const now = new Date().toISOString();

    await (supabase as any)
      .from("call_sessions")
      .update({ status: "missed", ended_at: now, updated_at: now })
      .eq("id", session.id)
      .eq("status", "ringing");

    const finalConversationId = session.conversation_id ?? undefined;

    if (finalConversationId) {
      await useCallHistoryStore.getState().addCallLog({
        conversationId: finalConversationId,
        sessionId: session.id,
        callerOrbitId: session.caller_orbit_id,
        receiverOrbitId: session.receiver_orbit_id,
        callType: (session.call_type as CallType) ?? "audio",
        direction: "incoming",
        status: "missed",
        endedAt: now,
      });

      await createCallSystemMessage({
        conversationId: finalConversationId,
        senderOrbitId: session.caller_orbit_id,
        body: session.call_type === "video" ? "Missed video call" : "Missed voice call",
        metadata: { callType: session.call_type, status: "missed", direction: "incoming", sessionId: session.id },
      });
    }

    set({ incoming: null, missedTimer: null });
  },

  startMissedCallTimer: (session) => {
    if (get().missedTimer) {
      clearTimeout(get().missedTimer!);
    }
    const timer = window.setTimeout(() => {
      void get().markMissedCall(session);
    }, 30000);
    set({ missedTimer: timer });
  },

  endCall: async (sessionId?, conversationId?, durationSec = 0) => {
    const current = get().current;
    const orbit = useOrbitStore.getState().profile;

    const sid = sessionId ?? current?.id;
    if (!sid) {
      set({ current: null, mode: "ended", type: null, peerOrbitId: null });
      platformBus.emit({ type: "call.ended", payload: { peerOrbitId: get().peerOrbitId } });
      setTimeout(() => set({ mode: "idle" }), 1500);
      return;
    }

    const now = new Date().toISOString();

    await (supabase as any)
      .from("call_sessions")
      .update({ status: "ended", ended_at: now, updated_at: now })
      .eq("id", sid);

    if (current && orbit && (conversationId || current.conversation_id)) {
      const finalConversationId = conversationId ?? current.conversation_id!;

      await useCallHistoryStore.getState().addCallLog({
        conversationId: finalConversationId,
        sessionId: sid,
        callerOrbitId: current.caller_orbit_id,
        receiverOrbitId: current.receiver_orbit_id,
        callType: (current.call_type as CallType) ?? "audio",
        direction: current.caller_orbit_id === orbit.orbitId ? "outgoing" : "incoming",
        status: "ended",
        startedAt: current.started_at ?? null,
        endedAt: now,
        durationSec,
      });

      await createCallSystemMessage({
        conversationId: finalConversationId,
        senderOrbitId: orbit.orbitId,
        body: current.call_type === "video" ? "Video call ended" : "Voice call ended",
        metadata: { callType: current.call_type, status: "ended", durationSec, sessionId: sid },
      });
    }

    set({ current: null, mode: "ended", type: null, peerOrbitId: null });
    platformBus.emit({ type: "call.ended", payload: { peerOrbitId: current?.receiver_orbit_id } });
    setTimeout(() => set({ mode: "idle" }), 1500);
  },

  toggleMic: () => set((s) => ({ localMicEnabled: !s.localMicEnabled })),
  toggleCam: () => set((s) => ({ localCamEnabled: !s.localCamEnabled })),
}));
