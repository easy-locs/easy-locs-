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
}

const CallContext = createContext<CallContextType>({
  startCall: async () => {},
  isInCall: false,
});

export const useCall = () => useContext(CallContext);

export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [callManager, setCallManager] = useState<CallManager | null>(null);
  const [callState, setCallState] = useState<Partial<CallState>>({});
  const [peerName, setPeerName] = useState("");
  const [contextLabel, setContextLabel] = useState("");
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [showIncoming, setShowIncoming] = useState(false);
  const [incomingCallId, setIncomingCallId] = useState<string | null>(null);
  const incomingCallIdRef = useRef<string | null>(null);
  const [incomingCallerName, setIncomingCallerName] = useState("");
  const [incomingContextLabel, setIncomingContextLabel] = useState("");
  const [incomingIsVideo, setIncomingIsVideo] = useState(false);
  const [incomingOrgId, setIncomingOrgId] = useState("");
  const [incomingThreadId, setIncomingThreadId] = useState<string | null>(null);
  // Track active call metadata for logging
  const activeCallRef = useRef<{ callId: string; threadId?: string; orgId: string } | null>(null);

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

      if (!memberships?.length) return;

      const orgIds = memberships.map((m) => m.org_id);

      const channel = supabase
        .channel("incoming-calls")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "call_logs" },
          async (payload) => {
            const call = payload.new as any;
            if (call.caller_id === user.id) return;
            if (!orgIds.includes(call.callee_org_id)) return;
            if (call.status !== "ringing") return;

            const { data: profile } = await supabase
              .from("profiles")
              .select("name, email")
              .eq("id", call.caller_id)
              .single();

            setIncomingCallId(call.id);
            setIncomingCallerName(profile?.name || profile?.email || "User");
            setIncomingContextLabel(call.context_label || "");
            setIncomingIsVideo(call.is_video || false);
            setShowIncoming(true);
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "call_logs" },
          (payload) => {
            const call = payload.new as any;
            // If this call was accepted/declined/ended by someone else, dismiss our ring
            if (call.status !== "ringing" && call.id === incomingCallIdRef.current) {
              setShowIncoming(false);
              setIncomingCallId(null);
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
      cleanup.then((fn) => fn?.());
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

      // Create call log entry
      const { data: callLog, error } = await supabase
        .from("call_logs")
        .insert({
          caller_id: user.id,
          callee_org_id: opts.orgId,
          thread_id: opts.threadId || null,
          context_type: opts.contextType || "listing",
          context_id: opts.contextId || null,
          context_label: opts.contextLabel || null,
          status: "ringing",
          is_video: opts.isVideo || false,
        } as any)
        .select("id")
        .single();

      if (error || !callLog) {
        console.error("Failed to create call:", error);
        return;
      }

      const manager = new CallManager({
        callId: callLog.id,
        userId: user.id,
        role: "caller",
        onStateChange: (state) => setCallState((prev) => ({ ...prev, ...state })),
      });

      setPeerName(opts.peerName);
      setContextLabel(opts.contextLabel || "");
      setCallManager(manager);
      setShowCallDialog(true);

      await manager.startCall(opts.isVideo || false);
    },
    [user]
  );

  const handleAcceptIncoming = useCallback(async () => {
    if (!user || !incomingCallId) return;

    setShowIncoming(false);

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
  }, [user, incomingCallId, incomingCallerName, incomingContextLabel, incomingIsVideo]);

  const handleDeclineIncoming = useCallback(async () => {
    if (!incomingCallId) return;
    setShowIncoming(false);

    // Update call status to declined
    await supabase
      .from("call_logs")
      .update({ status: "declined", ended_at: new Date().toISOString() } as any)
      .eq("id", incomingCallId);

    // Send decline signal via broadcast
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
  }, [incomingCallId, user]);

  const handleMissedIncoming = useCallback(async () => {
    if (!incomingCallId) return;
    setShowIncoming(false);

    await supabase
      .from("call_logs")
      .update({ status: "missed", ended_at: new Date().toISOString() } as any)
      .eq("id", incomingCallId);

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
  }, [incomingCallId, user]);

  const handleCloseCall = useCallback(() => {
    callManager?.cleanup();
    setCallManager(null);
    setShowCallDialog(false);
    setCallState({});
  }, [callManager]);

  return (
    <CallContext.Provider value={{ startCall, isInCall: showCallDialog }}>
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
