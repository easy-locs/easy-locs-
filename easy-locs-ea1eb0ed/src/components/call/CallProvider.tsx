/**
 * CallProvider — THIN ORCHESTRATOR for call state.
 * PHASE 5: Single source of truth via useCallStore. OrbitCallScreen handles ALL call UI (incoming + outgoing + active).
 *
 * CRITICAL: Never use `useCallStore()` without selectors here — it subscribes
 * to the entire store, causing infinite re-render loops when any call state
 * changes (Maximum update depth exceeded). Always use individual selectors or
 * `useCallStore.getState()` for imperative access inside callbacks.
 */
import { createContext, useContext, useState, useCallback, useEffect, useRef, lazy, Suspense, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { CallManager } from "@/lib/call-manager";
const OrbitCallScreen = lazy(() => import("./OrbitCallScreen").then(m => ({ default: m.OrbitCallScreen })));
import { useIncomingCallState } from "@/hooks/call/useIncomingCallState";
import { useIncomingCallListener } from "@/hooks/call/useIncomingCallListener";
import { useOutgoingCall } from "@/hooks/call/useOutgoingCall";
import { useMyOrbitId } from "@/hooks/call/useMyOrbitId";
import { useCallStore, type CallUIState } from "@/stores/orbit/call.store";
import { CallAudioEngine } from "@/families/calls/call-audio-engine";
import { logCallEventToThread } from "@/lib/call-thread-logger";
import { fetchCallLogStatus } from "@/repositories/communication.repository";
import { declineIncomingCall, markCallMissed } from "@/lib/call/call-incoming-handler";
import { platformBus } from "@/lib/shared/platform-bus";

interface CallContextType {
  startCall: (opts: {
    targetId: string; receiverUserId?: string; receiverOrbitId?: string;
    conversationId?: string; entityType?: string;
    entityId?: string; contextLabel?: string; peerName: string; isVideo?: boolean;
  }) => Promise<boolean>;
  isInCall: boolean;
  isStartingCall: boolean;
}

const CallContext = createContext<CallContextType>({
  startCall: async () => false,
  isInCall: false,
  isStartingCall: false,
});

export const useCall = () => useContext(CallContext);

const store = useCallStore;

export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const myOrbitId = useMyOrbitId(user?.id);

  const activeCallUiState = store((s) => s.activeCall?.uiState ?? null);
  const hasActiveCall = store((s) => s.hasActiveCall);

  const prevUiStateRef = useRef<CallUIState | null>(null);
  const callManagerRef = useRef<CallManager | null>(null);
  const activeCallMetaRef = useRef<{ callId: string; conversationId?: string; orgId: string; entityId?: string } | null>(null);
  const startingCallRef = useRef(false);
  const [isStartingCall, setIsStartingCall] = useState(false);
  const resetScheduledRef = useRef(false);

  useEffect(() => {
    store.getState().setCallManagerRef(callManagerRef);
  }, []);

  useEffect(() => {
    const call = store.getState().activeCall;
    if (!call) {
      if (prevUiStateRef.current !== null) {
        CallAudioEngine.stopAll();
        prevUiStateRef.current = null;
      }
      return;
    }
    if (prevUiStateRef.current !== call.uiState) {
      CallAudioEngine.onStateChange(prevUiStateRef.current, call.uiState, call.direction);
      prevUiStateRef.current = call.uiState;
    }
  }, [activeCallUiState]);

  const activeStartRef = useRef<number | null>(null);
  useEffect(() => {
    if (activeCallUiState !== "active") {
      activeStartRef.current = null;
      return;
    }
    if (!activeStartRef.current) {
      activeStartRef.current = Date.now();
    }
    const activeStart = activeStartRef.current;
    const tick = () => {
      const managerElapsed = store.getState().activeCall?.elapsed;
      if (managerElapsed && managerElapsed > 0) return;
      const elapsed = Math.floor((Date.now() - activeStart) / 1000);
      store.getState().setElapsed(elapsed);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeCallUiState]);

  const incoming = useIncomingCallState();
  const [callManager, setCallManager] = useState<CallManager | null>(null);

  useEffect(() => { callManagerRef.current = callManager; }, [callManager]);

  useIncomingCallListener(
    user?.id, myOrbitId, incoming.incomingCallIdRef,
    useCallback((info) => {
      incoming.setIncomingCall(info);
      store.getState().setIncoming({
        callId: info.callId,
        conversationId: info.conversationId || undefined,
        peer: { userId: "", name: info.callerName },
        mode: info.isVideo ? "video" : "audio",
      });
      if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.hidden) {
        try {
          new Notification(`${info.isVideo ? "Video" : "Voice"} call`, {
            body: `${info.callerName} is calling you`,
            icon: "/favicon.ico",
            tag: `call-${info.callId}`,
            requireInteraction: true,
          });
        } catch {}
      }
      if ("vibrate" in navigator) {
        try { navigator.vibrate([500, 200, 500, 200, 500]); } catch {}
      }
    }, [incoming.setIncomingCall]),
    useCallback(() => {
      incoming.clearIncoming();
      if (store.getState().activeCall?.uiState === "incoming") {
        store.getState().reset();
      }
    }, [incoming.clearIncoming]),
  );

  const wireManagerToStore = useCallback((manager: CallManager) => {
    manager.onStateChange = (state) => {
      if (state.status) {
        const stateMap: Record<string, CallUIState> = {
          idle: "idle", ringing: "ringing", connecting: "connecting",
          active: "active", ended: "ended", declined: "declined",
          missed: "missed", failed: "failed", network_blocked: "failed",
        };
        store.getState().transition(stateMap[state.status] || "calling");
      }
      if (state.elapsed !== undefined) store.getState().setElapsed(state.elapsed);
      if (state.error !== undefined) store.getState().setError(state.error || null);
      if (state.remoteStream) store.getState().setRemoteStream(state.remoteStream as MediaStream);
      if (state.localStream) store.getState().setLocalStream(state.localStream as MediaStream);
    };
  }, []);

  const { startCall } = useOutgoingCall(
    user?.id, startingCallRef,
    useCallback(({ manager, peerName: pn, contextLabel: cl, meta, isVideo }) => {
      wireManagerToStore(manager);
      setCallManager(manager);
      activeCallMetaRef.current = meta;

      store.getState().startOutgoing({
        callId: meta.callId,
        conversationId: meta.conversationId,
        peer: { userId: meta.orgId || "", name: pn },
        mode: isVideo ? "video" : "audio",
      });
    }, [wireManagerToStore]),
    setIsStartingCall,
  );

  const handleReset = useCallback(async () => {
    if (resetScheduledRef.current) return;
    resetScheduledRef.current = true;

    const meta = activeCallMetaRef.current;
    const convId = meta?.conversationId;
    if (convId && user?.id && meta) {
      try {
        const log = await fetchCallLogStatus(meta.callId);
        const logData = log as Record<string, unknown> | null;
        if (logData?.status === "ended") {
          logCallEventToThread({
            callId: meta.callId, conversationId: convId, orgId: meta.orgId,
            senderId: user.id, event: "ended",
            durationSeconds: (logData?.duration_sec as number) || 0,
            entityId: meta.entityId,
          });
        }
      } catch {}
    }
    callManagerRef.current?.cleanup("provider-close");
    platformBus.emit("orbit:call_ended", { status: store.getState().activeCall?.uiState || "ended" }, "orbit");
    activeCallMetaRef.current = null;
    setCallManager(null);
    setTimeout(() => {
      store.getState().reset();
      resetScheduledRef.current = false;
    }, 3500);
  }, [user?.id]);

  const doAcceptIncoming = useCallback(async () => {
    if (!user?.id || !incoming.incomingCallId) return;

    activeCallMetaRef.current = {
      callId: incoming.incomingCallId,
      conversationId: incoming.incomingConversationId || undefined,
      orgId: incoming.incomingOrgId,
    };

    store.getState().setIncoming({
      callId: incoming.incomingCallId,
      conversationId: incoming.incomingConversationId || undefined,
      peer: { userId: "", name: incoming.incomingCallerName },
      mode: incoming.incomingIsVideo ? "video" : "audio",
    });
    store.getState().transition("connecting");

    const manager = new CallManager({
      callId: incoming.incomingCallId, userId: user.id, role: "callee",
      onStateChange: () => {},
    });
    wireManagerToStore(manager);
    setCallManager(manager);
    incoming.clearIncoming();
    await manager.acceptCall(incoming.incomingIsVideo);
  }, [incoming, user?.id, wireManagerToStore]);

  useEffect(() => {
    const handleAccept = () => doAcceptIncoming();
    const handleDecline = () => {
      if (incoming.incomingCallId && user?.id) {
        declineIncomingCall(incoming.incomingCallId, user.id);
        if (incoming.incomingConversationId) {
          logCallEventToThread({
            callId: incoming.incomingCallId,
            conversationId: incoming.incomingConversationId,
            orgId: incoming.incomingOrgId,
            senderId: user.id,
            event: "declined",
          });
        }
      }
      incoming.clearIncoming();
      store.getState().endCall("declined");
    };
    window.addEventListener("orbit:call:accept", handleAccept);
    window.addEventListener("orbit:call:decline", handleDecline);
    return () => {
      window.removeEventListener("orbit:call:accept", handleAccept);
      window.removeEventListener("orbit:call:decline", handleDecline);
    };
  }, [doAcceptIncoming, incoming, user?.id]);

  useEffect(() => {
    const TERMINAL_STATES = ["ended", "missed", "declined", "failed"];
    const unsub = store.subscribe((state, prevState) => {
      const wasActive = prevState.activeCall && prevState.hasActiveCall;
      const nowTerminal = state.activeCall && TERMINAL_STATES.includes(state.activeCall.uiState) && !state.hasActiveCall;
      if (wasActive && nowTerminal) {
        if (state.activeCall?.uiState === "ended" && callManagerRef.current) {
          callManagerRef.current.endCall().catch(() => {});
        }
        handleReset();
      }
    });
    return unsub;
  }, [handleReset]);

  return (
    <CallContext.Provider value={{
      startCall,
      isInCall: hasActiveCall,
      isStartingCall,
    }}>
      {children}
      <Suspense fallback={null}><OrbitCallScreen /></Suspense>
    </CallContext.Provider>
  );
}
