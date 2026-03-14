/**
 * CallProvider — Global call state provider.
 * Listens for incoming calls via Supabase Realtime on call_logs table.
 * Renders IncomingCallDialog and InAppCallDialog globally.
 */
import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
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

  // Listen for incoming calls (calls where user's org is the callee)
  useEffect(() => {
    if (!user) return;

    // Get user's org memberships to listen for calls to those orgs
    const setupListener = async () => {
      const { data: memberships } = await supabase
        .from("org_members")
        .select("org_id")
        .eq("user_id", user.id);

      const orgIds = memberships?.map((m) => m.org_id) || [];

      const channel = supabase
        .channel("incoming-calls")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "call_logs" },
          async (payload) => {
            try {
              const call = payload.new as any;
              if (!call || call.caller_id === user.id) return;
              if (call.status !== "ringing") return;
              // Accept call if targeted at user's org, or directly/indirectly targeted to this user
              const isOrgCall = orgIds.length > 0 && orgIds.includes(call.callee_org_id);
              const isDirectCall = call.context_type === "direct" &&
                typeof call.context_id === "string" &&
                call.context_id.includes(user.id);

              let isTenantTarget = false;
              if (call.context_type === "tenant" && typeof call.context_id === "string") {
                const { data: tenantMatch } = await supabase
                  .from("tenants")
                  .select("id")
                  .eq("id", call.context_id)
                  .eq("tenant_user_id", user.id)
                  .maybeSingle();
                isTenantTarget = !!tenantMatch;
              }

              let isThreadParticipant = false;
              if (call.thread_id) {
                const { data: threadMatch } = await supabase
                  .from("conversation_threads")
                  .select("id")
                  .eq("id", call.thread_id)
                  .contains("participant_ids", [user.id])
                  .maybeSingle();
                isThreadParticipant = !!threadMatch;
              }

              if (!isOrgCall && !isDirectCall && !isTenantTarget && !isThreadParticipant) return;

              const { data: profile } = await supabase
                .from("profiles")
                .select("name, email")
                .eq("id", call.caller_id)
                .single();

              setIncomingCallId(call.id);
              setIncomingCallerName(profile?.name || profile?.email || "User");
              setIncomingContextLabel(call.context_label || "");
              setIncomingIsVideo(call.is_video || false);
              setIncomingOrgId(call.callee_org_id || "");
              setIncomingThreadId(call.thread_id || null);
              setShowIncoming(true);
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
              const call = payload.new as any;
              // If this call was accepted/declined/ended by someone else, dismiss our ring
              if (call && call.status !== "ringing" && call.id === incomingCallIdRef.current) {
                setShowIncoming(false);
                setIncomingCallId(null);
              }
            } catch (err) {
              console.error("[CallProvider] call update handler error:", err);
            }
          }
        )
        .subscribe();

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
          toast.error("Session expirée. Reconnectez-vous pour lancer un appel.");
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

        // Use idempotent server-side function to prevent duplicates
        const { data: callId, error } = await supabase.rpc("create_call_idempotent", {
          _caller_id: authUser.id,
          _callee_org_id: opts.orgId,
          _thread_id: opts.threadId || null,
          _context_type: opts.contextType || "listing",
          _context_id: opts.contextId || null,
          _context_label: opts.contextLabel || null,
          _is_video: opts.isVideo || false,
        });

        console.log("[CallProvider] create_call_idempotent response", { callId, error: error?.message || null });

        if (error || !callId) {
          console.error("Failed to create call:", error);
          const errMsg = error?.message || "Impossible de démarrer l'appel";
          if (errMsg.includes("Unauthorized")) {
            toast.error("Autorisation refusée. Merci de vous reconnecter puis réessayer.");
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
        .select("status, duration_seconds")
        .eq("id", meta.callId)
        .single();
      const status = (log as any)?.status;
      if (status === "ended") {
        logCallEventToThread({
          callId: meta.callId, threadId: meta.threadId,
          orgId: meta.orgId, senderId: user.id, event: "ended",
          durationSeconds: (log as any)?.duration_seconds || 0,
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
