/**
 * CallProvider — THIN ORCHESTRATOR for call state.
 * Delegates to atomic units: call-target-resolver, call-rpc, call-incoming-handler.
 * CallManager handles WebRTC (already decomposed into call/ice-config, signaling, media, call-db).
 */
import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { platformBus } from "@/lib/shared/platform-bus";
import { startFlow, addStep, completeStep, failStep, endFlow } from "@/lib/runtime/flow-tracer";
import { reportHealth } from "@/lib/runtime/health-aggregator";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CallManager, type CallState } from "@/lib/call-manager";
import { logCallEventToThread } from "@/lib/call-thread-logger";
import { toast } from "sonner";
import InAppCallDialog from "./InAppCallDialog";
import IncomingCallDialog from "./IncomingCallDialog";
import { debugLog } from "@/lib/debug/runtime-debug-bus";
import { resolveCallTarget } from "@/lib/call/call-target-resolver";
import { createCallRpc } from "@/lib/call/call-rpc";
import { processIncomingInsert, processIncomingUpdate, declineIncomingCall, markCallMissed } from "@/lib/call/call-incoming-handler";
import { registerChannel, unregisterChannel, recordEvent } from "@/lib/runtime/realtime-monitor";

interface CallContextType {
  startCall: (opts: {
    targetId: string;
    threadId?: string;
    contextType?: string;
    contextId?: string;
    contextLabel?: string;
    peerName: string;
    isVideo?: boolean;
  }) => Promise<void>;
  isInCall: boolean;
  isStartingCall: boolean;
}

const CallContext = createContext<CallContextType>({
  startCall: async () => {},
  isInCall: false,
  isStartingCall: false,
});

export const useCall = () => useContext(CallContext);

export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [callManager, setCallManager] = useState<CallManager | null>(null);
  const [callState, setCallState] = useState<Partial<CallState>>({});
  const [peerName, setPeerName] = useState("");
  const [contextLabel, setContextLabel] = useState("");
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [isStartingCall, setIsStartingCall] = useState(false);
  const [showIncoming, setShowIncoming] = useState(false);
  const [incomingCallId, setIncomingCallId] = useState<string | null>(null);
  const incomingCallIdRef = useRef<string | null>(null);
  const [incomingCallerName, setIncomingCallerName] = useState("");
  const [incomingContextLabel, setIncomingContextLabel] = useState("");
  const [incomingIsVideo, setIncomingIsVideo] = useState(false);
  const [incomingOrgId, setIncomingOrgId] = useState("");
  const [incomingThreadId, setIncomingThreadId] = useState<string | null>(null);
  const activeCallRef = useRef<{ callId: string; threadId?: string; orgId: string; contextId?: string } | null>(null);
  const startingCallRef = useRef(false);

  useEffect(() => { incomingCallIdRef.current = incomingCallId; }, [incomingCallId]);

  // Resolve orbit ID
  const [myOrbitId, setMyOrbitId] = useState<string | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    (supabase as any)
      .from("orbit_profiles_v2").select("orbit_id").eq("id", user.id).maybeSingle()
      .then(({ data }: any) => { if (data?.orbit_id) setMyOrbitId(data.orbit_id); });
  }, [user?.id]);

  // ── Incoming call listener (realtime) ──
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!user) return;
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }

    const receiverIds = [user.id, ...(myOrbitId && myOrbitId !== user.id ? [myOrbitId] : [])];
    const channelName = `incoming-calls-${user.id}-${Date.now()}`;
    registerChannel(channelName, "calls");

    const handleInsert = async (payload: any) => {
      recordEvent(channelName);
      const info = await processIncomingInsert(payload.new, user.id, myOrbitId);
      if (!info) return;
      debugLog.success("call", "call.signal.received", `INSERT ${info.callId}`, payload.new);
      setIncomingCallId(info.callId);
      setIncomingCallerName(info.callerName);
      setIncomingContextLabel(info.contextLabel);
      setIncomingIsVideo(info.isVideo);
      setIncomingOrgId(info.orgId);
      setIncomingThreadId(info.threadId);
      setShowIncoming(true);
    };

    const handleUpdate = (payload: any) => {
      recordEvent(channelName);
      debugLog.info("call", "call.signal.updated", `UPDATE ${payload.new?.id || "unknown"}`, payload.new);
      if (processIncomingUpdate(payload.new, incomingCallIdRef.current)) {
        setShowIncoming(false);
        setIncomingCallId(null);
      }
    };

    let channel = supabase.channel(channelName);
    for (const rid of receiverIds) {
      channel = channel
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "call_logs", filter: `receiver_orbit_id=eq.${rid}` }, handleInsert)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "call_logs", filter: `receiver_orbit_id=eq.${rid}` }, handleUpdate);
    }

    channel.subscribe((status, err) => {
      if (status === "SUBSCRIBED") {
        debugLog.success("realtime", "call.subscription.subscribed", "CallProvider reached SUBSCRIBED", { userId: user.id });
      } else if (status === "CHANNEL_ERROR") {
        debugLog.error("realtime", "call.subscription.error", err?.message || "CHANNEL_ERROR", { userId: user.id });
      } else if (status === "TIMED_OUT") {
        debugLog.warn("realtime", "call.subscription.timeout", "Subscription timed out", { userId: user.id });
      }
    });

    channelRef.current = channel;
    return () => {
      unregisterChannel(channelName);
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    };
  }, [user?.id, myOrbitId]);

  // ── Start call (outgoing) ──
  const startCall = useCallback(async (opts: {
    targetId: string; threadId?: string; contextType?: string;
    contextId?: string; contextLabel?: string; peerName: string; isVideo?: boolean;
  }) => {
    if (!user) { toast.error("Authentication required."); return; }
    if (startingCallRef.current) return;
    startingCallRef.current = true;
    setIsStartingCall(true);

    const flow = startFlow("orbit", "outgoingCall");
    try {
      const authStep = addStep(flow, "auth_check");
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user?.id) {
        failStep(flow, authStep, "session_expired");
        endFlow(flow, "failed");
        toast.error(t("call.error.session_expired") || "Session expired.");
        return;
      }
      completeStep(flow, authStep);

      const resolveStep = addStep(flow, "resolve_target");
      const receiverUserId = await resolveCallTarget(opts.targetId, authData.user.id);
      if (!receiverUserId || receiverUserId === authData.user.id) {
        failStep(flow, resolveStep, "no_callable_target");
        endFlow(flow, "failed");
        toast.error(receiverUserId === authData.user.id
          ? "No other team member available."
          : "Could not find a callable contact.");
        return;
      }
      completeStep(flow, resolveStep, { receiverUserId });

      const rpcStep = addStep(flow, "db_write");
      const result = await createCallRpc({
        callerUserId: authData.user.id, receiverUserId,
        threadId: opts.threadId, contextType: opts.contextType,
        contextId: opts.contextId, contextLabel: opts.contextLabel,
        isVideo: opts.isVideo || false,
      });

      if (!result.success || !result.callId) {
        failStep(flow, rpcStep, result.error || "rpc_failed");
        endFlow(flow, "failed");
        toast.error(result.error || "Unable to start call");
        return;
      }
      completeStep(flow, rpcStep, { callId: result.callId });

      const manager = new CallManager({
        callId: result.callId, userId: authData.user.id, role: "caller",
        onStateChange: (state) => setCallState((prev) => ({ ...prev, ...state })),
      });

      setPeerName(opts.peerName);
      setContextLabel(opts.contextLabel || "");
      setCallManager(manager);
      setShowCallDialog(true);
      activeCallRef.current = { callId: result.callId, threadId: opts.threadId, orgId: opts.targetId, contextId: opts.contextId };
      platformBus.emit("call:started", { callId: result.callId, role: "caller", isVideo: opts.isVideo || false, peerName: opts.peerName }, "orbit");
      
      const mediaStep = addStep(flow, "media_start");
      await manager.startCall(opts.isVideo || false);
      completeStep(flow, mediaStep);
      
      reportHealth("orbit", "ok");
      endFlow(flow, "success");
    } catch (err: any) {
      reportHealth("orbit", "degraded", undefined, err?.message);
      endFlow(flow, "failed");
      console.error("[CallProvider] startCall error:", err);
    } finally {
      startingCallRef.current = false;
      setIsStartingCall(false);
    }
  }, [user, t]);

  // ── Accept incoming ──
  const handleAcceptIncoming = useCallback(async () => {
    if (!user || !incomingCallId) return;
    setShowIncoming(false);
    activeCallRef.current = { callId: incomingCallId, threadId: incomingThreadId || undefined, orgId: incomingOrgId, contextId: undefined };

    const manager = new CallManager({
      callId: incomingCallId, userId: user.id, role: "callee",
      onStateChange: (state) => setCallState((prev) => ({ ...prev, ...state })),
    });

    setPeerName(incomingCallerName);
    setContextLabel(incomingContextLabel);
    setCallManager(manager);
    setShowCallDialog(true);
    await manager.acceptCall(incomingIsVideo);
  }, [user, incomingCallId, incomingCallerName, incomingContextLabel, incomingIsVideo, incomingOrgId, incomingThreadId]);

  // ── Decline incoming ──
  const handleDeclineIncoming = useCallback(async () => {
    if (!incomingCallId || !user) return;
    setShowIncoming(false);
    await declineIncomingCall(incomingCallId, user.id);
    if (incomingThreadId) {
      logCallEventToThread({ callId: incomingCallId, threadId: incomingThreadId, orgId: incomingOrgId, senderId: user.id, event: "declined" });
    }
    setIncomingCallId(null);
  }, [incomingCallId, user, incomingThreadId, incomingOrgId]);

  // ── Missed incoming ──
  const handleMissedIncoming = useCallback(async () => {
    if (!incomingCallId || !user) return;
    setShowIncoming(false);
    await markCallMissed(incomingCallId, user.id);
    if (incomingThreadId) {
      logCallEventToThread({ callId: incomingCallId, threadId: incomingThreadId, orgId: incomingOrgId, senderId: user.id, event: "missed" });
    }
    setIncomingCallId(null);
  }, [incomingCallId, user, incomingThreadId, incomingOrgId]);

  // ── Close call ──
  const handleCloseCall = useCallback(async () => {
    const meta = activeCallRef.current;
    if (meta?.threadId && user) {
      const { data: log } = await supabase.from("call_logs").select("status, duration_sec").eq("id", meta.callId).single();
      if ((log as any)?.status === "ended") {
        logCallEventToThread({
          callId: meta.callId, threadId: meta.threadId, orgId: meta.orgId,
          senderId: user.id, event: "ended", durationSeconds: (log as any)?.duration_sec || 0,
          contextId: meta.contextId,
        });
      }
    }
    activeCallRef.current = null;
    callManager?.cleanup("provider-close");
    platformBus.emit("call:ended", { status: callState.status || "ended" }, "orbit");
    setCallManager(null);
    setShowCallDialog(false);
    setCallState({});
    startingCallRef.current = false;
    setIsStartingCall(false);
  }, [callManager, callState.status, user]);

  return (
    <CallContext.Provider value={{ startCall, isInCall: showCallDialog, isStartingCall }}>
      {children}
      <IncomingCallDialog
        open={showIncoming} callerName={incomingCallerName}
        contextLabel={incomingContextLabel} isVideo={incomingIsVideo}
        onAccept={handleAcceptIncoming} onDecline={handleDeclineIncoming}
        onMissed={handleMissedIncoming}
      />
      <InAppCallDialog
        open={showCallDialog} onClose={handleCloseCall}
        callManager={callManager} peerName={peerName} contextLabel={contextLabel}
      />
    </CallContext.Provider>
  );
}
