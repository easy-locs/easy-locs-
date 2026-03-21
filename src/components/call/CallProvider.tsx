/**
 * CallProvider — Global call state provider.
 * Listens for incoming calls via Supabase Realtime on call_logs table.
 * Renders IncomingCallDialog and InAppCallDialog globally.
 */
import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { platformBus } from "@/app/events/platform-bus";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CallManager, type CallState } from "@/lib/call-manager";
import { logCallEventToThread } from "@/lib/call-thread-logger";
import { toast } from "sonner";
import InAppCallDialog from "./InAppCallDialog";
import IncomingCallDialog from "./IncomingCallDialog";

interface CallContextType {
  /** Start a call to an org (provider) */
  startCall: (opts: {
    orgId: string;
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

  // Listen for incoming calls (calls where user's org or user ID is the receiver)
  useEffect(() => {
    if (!user) return;

    const setupListener = async () => {
      const receiverIds = new Set([user.id]);

      console.log("[CallProvider] incoming listener setup", {
        userId: user.id,
        receiverIds: Array.from(receiverIds),
      });

      const channel = supabase
        .channel(`incoming-calls-${user.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "call_logs" },
          async (payload) => {
            try {
              const call = payload.new as any;
              console.log("[CallProvider] realtime event INSERT", payload);
              if (!call) {
                console.warn("[CallProvider] missing condition: payload.new is empty");
                return;
              }

              if (call.caller_orbit_id === user.id) {
                console.warn("[CallProvider] missing condition: skipped self-originated call", { callId: call.id });
                return;
              }

              if (call.status !== "ringing") {
                console.warn("[CallProvider] missing condition: call status is not ringing", { callId: call.id, status: call.status });
                return;
              }

              if (!receiverIds.has(call.receiver_orbit_id)) {
                console.warn("[CallProvider] missing condition: receiver_orbit_id did not match authenticated user_id", {
                  callId: call.id,
                  receiverOrbitId: call.receiver_orbit_id,
                  expectedUserId: user.id,
                });
                return;
              }

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

              console.log("[CallProvider] incoming popup SHOWN", {
                callId: call.id,
                callerName: profile?.name || profile?.email || "User",
              });
            } catch (err) {
              console.error("[CallProvider] incoming call handler error:", err);
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "call_logs" },
          (payload) => {
            try {
              console.log("[CallProvider] realtime event UPDATE", payload);
              const call = payload.new as any;
              if (!call) {
                console.warn("[CallProvider] missing condition: update payload.new is empty");
                return;
              }
              if (call && call.status !== "ringing" && call.id === incomingCallIdRef.current) {
                setShowIncoming(false);
                setIncomingCallId(null);
              }
            } catch (err) {
              console.error("[CallProvider] call update handler error:", err);
            }
          }
        )
        .subscribe((status) => {
          console.log("[CallProvider] realtime subscription status:", status);
        });

      return () => {
        supabase.removeChannel(channel);
      };
    };

    const cleanup = setupListener();
    return () => {
      cleanup.then((fn) => fn?.()).catch(() => {});
    };
  }, [user]);

  const startCall = useCallback(
    async (opts: {
      orgId: string;
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
          orgId: opts.orgId,
          contextType: opts.contextType || "listing",
          contextId: opts.contextId || null,
          threadId: opts.threadId || null,
          contextUserId: user.id,
          authUserId: authUser.id,
        });

        let receiverOrbitId = opts.orgId;
        const { data: matchedMember, error: matchedMemberError } = await supabase
          .from("org_members")
          .select("user_id")
          .eq("org_id", opts.orgId)
          .neq("user_id", authUser.id)
          .limit(1)
          .maybeSingle();

        if (!matchedMemberError && matchedMember?.user_id) {
          receiverOrbitId = matchedMember.user_id;
        }

        if (receiverOrbitId === authUser.id) {
          toast.error(t("call.error.start_failed") || "Unable to start call");
          console.warn("[CallProvider] blocked self-call after receiver resolution", {
            requestedReceiver: opts.orgId,
            resolvedReceiver: receiverOrbitId,
          });
          return;
        }

        console.log("[CallProvider] receiver resolved", {
          requestedReceiver: opts.orgId,
          resolvedReceiver: receiverOrbitId,
          viaOrgMember: receiverOrbitId !== opts.orgId,
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
        activeCallRef.current = { callId: callId as string, threadId: opts.threadId, orgId: opts.orgId, contextId: opts.contextId };

        console.log("[CallProvider] call manager initialized", { callId });
        await manager.startCall(opts.isVideo || false);
      } catch (err) {
        console.error("Failed to start call:", err);
      } finally {
        startingCallRef.current = false;
        setIsStartingCall(false);
      }
    },
    [user]
  );

  // Listen for call.request events from non-React contexts (e.g. contactStore)
  useEffect(() => {
    const unsub = platformBus.on("call.request", (event) => {
      void startCall({
        orgId: event.payload.orgId,
        peerName: event.payload.peerName,
        isVideo: event.payload.isVideo,
        threadId: event.payload.threadId,
      });
    });
    return unsub;
  }, [startCall]);

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
