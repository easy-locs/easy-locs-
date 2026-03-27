/**
 * CallProvider — Global call state provider.
 * Listens for incoming calls via Supabase Realtime on call_logs table.
 * Renders IncomingCallDialog and InAppCallDialog globally.
 */
import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { platformBus } from "@/lib/shared/platform-bus";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CallManager, type CallState } from "@/lib/call-manager";
import { logCallEventToThread } from "@/lib/call-thread-logger";
import { toast } from "sonner";
import InAppCallDialog from "./InAppCallDialog";
import IncomingCallDialog from "./IncomingCallDialog";
import { debugLog } from "@/lib/debug/runtime-debug-bus";

interface CallContextType {
  /** Start a call — targetId is the peer userId OR an orgId (resolved internally) */
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
  // Track active call metadata for logging
  const activeCallRef = useRef<{ callId: string; threadId?: string; orgId: string; contextId?: string } | null>(null);
  const startingCallRef = useRef(false); // Lock to prevent duplicate startCall

  // Keep ref in sync for use in realtime closures
  useEffect(() => { incomingCallIdRef.current = incomingCallId; }, [incomingCallId]);

  // Listen for incoming calls via Supabase Realtime on call_logs
  const channelRef = useRef<any>(null);

  const resolveReceiverUserId = useCallback(async (rawTargetId: string) => {
    const normalized = rawTargetId.trim();
    if (!normalized) return "";

    const { data: directProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", normalized)
      .maybeSingle();

    if (directProfile?.id && directProfile.id !== user?.id) return directProfile.id;

    // Try org owner first
    const { data: ownerMembership } = await supabase
      .from("org_members")
      .select("user_id, role")
      .eq("org_id", normalized)
      .eq("role", "owner")
      .limit(1)
      .maybeSingle();

    if (ownerMembership?.user_id && ownerMembership.user_id !== user?.id) {
      return ownerMembership.user_id;
    }

    // Try org.owner_user_id
    const { data: org } = await supabase
      .from("orgs")
      .select("owner_user_id")
      .eq("id", normalized)
      .maybeSingle();

    if (org?.owner_user_id && org.owner_user_id !== user?.id) {
      return org.owner_user_id;
    }

    // Fallback: any OTHER member of the org (skip self)
    const { data: otherMembers } = await supabase
      .from("org_members")
      .select("user_id")
      .eq("org_id", normalized)
      .neq("user_id", user?.id ?? "")
      .limit(1)
      .maybeSingle();

    if (otherMembers?.user_id) return otherMembers.user_id;

    // No other member found — return empty to trigger clear error
    console.warn("[CallProvider] no callable target found (all resolved to self)", { rawTarget: rawTargetId, callerId: user?.id });
    return "";
  }, [user?.id]);

  // Resolve orbit ID for realtime filter
  const [myOrbitId, setMyOrbitId] = useState<string | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    (supabase as any)
      .from("orbit_profiles_v2")
      .select("orbit_id")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data?.orbit_id) setMyOrbitId(data.orbit_id);
      });
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    // Clean up previous channel synchronously to prevent race
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Listen on BOTH auth user ID and orbit ID to catch calls from both paths
    const receiverIds = [user.id, ...(myOrbitId && myOrbitId !== user.id ? [myOrbitId] : [])];

    console.log("[CallProvider] incoming listener setup", {
      userId: user.id,
      receiverIds,
    });
    debugLog.info("realtime", "call.subscription.setup", "Creating incoming call subscription", {
      userId: user.id,
      receiverIds,
    });

    const handleInsert = async (payload: any) => {
      try {
        const call = payload.new as any;
        console.log("[CallProvider] realtime INSERT received", { callId: call?.id, status: call?.status, receiver: call?.receiver_orbit_id });
        debugLog.success("call", "call.signal.received", `INSERT ${call?.id || "unknown"}`, call);
        if (!call || call.status !== "ringing") return;
        if (call.caller_orbit_id === user.id || call.caller_orbit_id === myOrbitId) return; // skip self

        const { data: profile } = await supabase
          .from("profiles")
          .select("name, email")
          .eq("id", call.caller_orbit_id)
          .single();

        setIncomingCallId(call.id);
        setIncomingCallerName(profile?.name || profile?.email || "User");
        setIncomingContextLabel("");
        setIncomingIsVideo(call.call_type === "video");
        setIncomingOrgId(call.receiver_orbit_id || "");
        setIncomingThreadId(call.conversation_id || null);
        setShowIncoming(true);

        console.log("[CallProvider] incoming popup SHOWN", { callId: call.id });
      } catch (err) {
        console.error("[CallProvider] incoming handler error:", err);
      }
    };

    const handleUpdate = (payload: any) => {
      try {
        console.log("[CallProvider] realtime UPDATE received", payload.new);
        const call = payload.new as any;
        debugLog.info("call", "call.signal.updated", `UPDATE ${call?.id || "unknown"}`, call);
        if (call && call.status !== "ringing" && call.id === incomingCallIdRef.current) {
          setShowIncoming(false);
          setIncomingCallId(null);
        }
      } catch (err) {
        console.error("[CallProvider] update handler error:", err);
      }
    };

    // Build channel with listeners for each receiver ID
    let channel = supabase
      .channel(`incoming-calls-${user.id}-${Date.now()}`);

    for (const rid of receiverIds) {
      channel = channel
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "call_logs", filter: `receiver_orbit_id=eq.${rid}` }, handleInsert)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "call_logs", filter: `receiver_orbit_id=eq.${rid}` }, handleUpdate);
    }

    channel.subscribe((status, err) => {
      if (status === "SUBSCRIBED") {
        console.log("[CallProvider] realtime subscription active");
        debugLog.success("realtime", "call.subscription.subscribed", "CallProvider reached SUBSCRIBED", { userId: user.id });
      } else if (status === "CHANNEL_ERROR") {
        console.warn("[CallProvider] channel error, will auto-retry on next mount");
        debugLog.error("realtime", "call.subscription.error", err?.message || "CHANNEL_ERROR", { userId: user.id, err });
      } else if (status === "TIMED_OUT") {
        console.warn("[CallProvider] subscription timed out");
        debugLog.warn("realtime", "call.subscription.timeout", "Subscription timed out", { userId: user.id });
      } else {
        debugLog.info("realtime", "call.subscription.status", status, { userId: user.id, err });
      }
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, myOrbitId]);

  const startCall = useCallback(
    async (opts: {
      targetId: string;
      threadId?: string;
      contextType?: string;
      contextId?: string;
      contextLabel?: string;
      peerName: string;
      isVideo?: boolean;
    }) => {
      if (!user) return;
      if (startingCallRef.current) {
        console.log("[CallProvider] startCall ignored (already starting)");
        return;
      }

      startingCallRef.current = true;
      setIsStartingCall(true);

      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        const authUser = authData?.user;

        if (authError || !authUser?.id) {
          toast.error(t("call.error.session_expired") || "Session expired. Please log in again.");
          return;
        }

        console.log("[CallProvider] startCall requested", {
          targetId: opts.targetId,
          contextType: opts.contextType || "listing",
          contextId: opts.contextId || null,
          threadId: opts.threadId || null,
          contextUserId: user.id,
          authUserId: authUser.id,
        });

        const receiverOrbitId = await resolveReceiverUserId(opts.targetId);

        if (!receiverOrbitId || receiverOrbitId === authUser.id) {
          const reason = receiverOrbitId === authUser.id
            ? "No other team member available to receive this call."
            : "Could not find a callable contact for this business.";
          toast.error(reason);
          console.warn("[CallProvider] no callable target", { rawTarget: opts.targetId, resolved: receiverOrbitId, reason });
          return;
        }

        console.log("[CallProvider] sending to RPC", {
          callerOrbitId: authUser.id,
          rawTarget: opts.targetId,
          receiverOrbitId,
        });

        // Use idempotent server-side function to prevent duplicates
        const { data: callId, error } = await supabase.rpc("create_call_idempotent" as any, {
          _caller_orbit_id: authUser.id,
          _receiver_orbit_id: receiverOrbitId,
          _thread_id: opts.threadId || null,
          _context_type: opts.contextType || "listing",
          _context_id: opts.contextId || null,
          _context_label: opts.contextLabel || null,
          _is_video: opts.isVideo || false,
        });

        console.log("[CallProvider] create_call_idempotent response", { callId, error: error?.message || null });

        if (error || !callId) {
          console.error("Failed to create call:", error);
          const errMsg = error?.message || (t("call.error.start_failed") || "Unable to start call");
          if (errMsg.includes("Unauthorized")) {
            toast.error(t("call.error.auth_denied") || "Authorization denied. Please log in again.");
          } else {
            toast.error(errMsg);
          }
          return;
        }

        const manager = new CallManager({
          callId: callId as string,
          userId: authUser.id,
          role: "caller",
          onStateChange: (state) => setCallState((prev) => ({ ...prev, ...state })),
        });

        setPeerName(opts.peerName);
        setContextLabel(opts.contextLabel || "");
        setCallManager(manager);
        setShowCallDialog(true);
        activeCallRef.current = { callId: callId as string, threadId: opts.threadId, orgId: opts.targetId, contextId: opts.contextId };

        console.log("[CallProvider] call manager initialized", { callId });
        platformBus.emit("call:started", { callId, role: "caller", isVideo: opts.isVideo || false, peerName: opts.peerName }, "orbit");
        await manager.startCall(opts.isVideo || false);
      } catch (err) {
        console.error("Failed to start call:", err);
      } finally {
        startingCallRef.current = false;
        setIsStartingCall(false);
      }
    },
    [resolveReceiverUserId, t, user]
  );

  // Legacy call.request listener removed — contactStore purged. Use useCall().startCall directly.

  const handleAcceptIncoming = useCallback(async () => {
    if (!user || !incomingCallId) return;

    setShowIncoming(false);
    activeCallRef.current = { callId: incomingCallId, threadId: incomingThreadId || undefined, orgId: incomingOrgId, contextId: undefined };

    const manager = new CallManager({
      callId: incomingCallId,
      userId: user.id,
      role: "callee",
      onStateChange: (state) => setCallState((prev) => ({ ...prev, ...state })),
    });

    setPeerName(incomingCallerName);
    setContextLabel(incomingContextLabel);
    setCallManager(manager);
    setShowCallDialog(true);

    await manager.acceptCall(incomingIsVideo);
  }, [user, incomingCallId, incomingCallerName, incomingContextLabel, incomingIsVideo, incomingOrgId, incomingThreadId]);

  const handleDeclineIncoming = useCallback(async () => {
    if (!incomingCallId) return;
    setShowIncoming(false);

    await supabase
      .from("call_logs")
      .update({ status: "declined", ended_at: new Date().toISOString() } as any)
      .eq("id", incomingCallId);

    // Log decline to thread
    if (incomingThreadId && user) {
      logCallEventToThread({
        callId: incomingCallId, threadId: incomingThreadId,
        orgId: incomingOrgId, senderId: user.id, event: "declined",
      });
    }

    const channel = supabase.channel(`call:${incomingCallId}`, {
      config: { broadcast: { self: false } },
    });
    await channel.subscribe();
    channel.send({
      type: "broadcast",
      event: "signal",
      payload: { type: "declined", data: "{}", from: user?.id || "" },
    });
    setTimeout(() => supabase.removeChannel(channel), 1000);

    setIncomingCallId(null);
  }, [incomingCallId, user, incomingThreadId, incomingOrgId]);

  const handleMissedIncoming = useCallback(async () => {
    if (!incomingCallId) return;
    setShowIncoming(false);

    await supabase
      .from("call_logs")
      .update({ status: "missed", ended_at: new Date().toISOString() } as any)
      .eq("id", incomingCallId);

    // Log missed to thread
    if (incomingThreadId && user) {
      logCallEventToThread({
        callId: incomingCallId, threadId: incomingThreadId,
        orgId: incomingOrgId, senderId: user.id, event: "missed",
      });
    }

    const channel = supabase.channel(`call:${incomingCallId}`, {
      config: { broadcast: { self: false } },
    });
    await channel.subscribe();
    channel.send({
      type: "broadcast",
      event: "signal",
      payload: { type: "declined", data: "{}", from: user?.id || "" },
    });
    setTimeout(() => supabase.removeChannel(channel), 1000);

    setIncomingCallId(null);
  }, [incomingCallId, user, incomingThreadId, incomingOrgId]);

  const handleCloseCall = useCallback(async () => {
    console.log("[CallProvider] handleCloseCall", {
      activeCallId: activeCallRef.current?.callId || null,
      status: callState.status || null,
    });

    // Log ended call to thread
    const meta = activeCallRef.current;
    if (meta?.threadId && user) {
      // Fetch duration from call_logs
      const { data: log } = await supabase
        .from("call_logs")
        .select("status, duration_sec")
        .eq("id", meta.callId)
        .single();
      const status = (log as any)?.status;
      if (status === "ended") {
        logCallEventToThread({
          callId: meta.callId, threadId: meta.threadId,
          orgId: meta.orgId, senderId: user.id, event: "ended",
          durationSeconds: (log as any)?.duration_sec || 0,
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


      {/* Incoming call dialog */}
      <IncomingCallDialog
        open={showIncoming}
        callerName={incomingCallerName}
        contextLabel={incomingContextLabel}
        isVideo={incomingIsVideo}
        onAccept={handleAcceptIncoming}
        onDecline={handleDeclineIncoming}
        onMissed={handleMissedIncoming}
      />

      {/* Active call dialog */}
      <InAppCallDialog
        open={showCallDialog}
        onClose={handleCloseCall}
        callManager={callManager}
        peerName={peerName}
        contextLabel={contextLabel}
      />
    </CallContext.Provider>
  );
}
