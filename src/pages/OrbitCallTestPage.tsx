/**
 * OrbitCallTestPage — Full WebRTC call test with realtime signaling.
 */
import { useEffect, useRef, useState } from "react";
import { debugLog } from "@/lib/debug/runtime-debug-bus";
import { useAuth } from "@/contexts/AuthContext";
import { useCallSignals } from "@/hooks/useCallSignals";
import { useIncomingCalls } from "@/hooks/useIncomingCalls";
import IncomingCallModal from "@/components/calls/IncomingCallModal";
import { OrbitCallService } from "@/lib/calls/call-service";
import { assertCallReady } from "@/lib/calls/call-guards";
import { supabase } from "@/integrations/supabase/client";
import type { CallSessionRecord, CallSignalRecord, CallType } from "@/lib/calls/call-types";

export default function OrbitCallTestPage() {
  const { user, loading } = useAuth();
  const [peerUserId, setPeerUserId] = useState("");
  const [callType, setCallType] = useState<CallType>("audio");
  const [currentSession, setCurrentSession] = useState<CallSessionRecord | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const serviceRef = useRef(new OrbitCallService());

  const { incoming } = useIncomingCalls(user?.id ?? null);

  useCallSignals({
    userId: user?.id ?? null,
    onSignal: async (signal: CallSignalRecord) => {
      const service = serviceRef.current;

      if (signal.signal_type === "offer") {
        const { data: session } = await (supabase as any)
          .from("orbit_call_sessions")
          .select("*")
          .eq("id", signal.session_id)
          .maybeSingle();

        setCurrentSession(session ?? null);
        return;
      }

      await service.handleSignal(signal);

      const manager = service.getManager();
      if (manager && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = manager.getRemoteStream();
      }
    },
  });

  const openIncoming = incoming[0] ?? currentSession;

  const startCall = async () => {
    if (!user?.id || !peerUserId) return;

    try {
      assertCallReady({ video: callType === "video" });

      const { session, manager } = await serviceRef.current.startOutgoingCall({
        callerUserId: user.id,
        calleeUserId: peerUserId,
        callType,
      });

      setCurrentSession(session);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = manager.getLocalStream();
        localVideoRef.current.muted = true;
        localVideoRef.current.playsInline = true;
        await localVideoRef.current.play().catch(() => {});
      }

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = manager.getRemoteStream();
        remoteVideoRef.current.playsInline = true;
      }
    } catch (e: any) {
      console.error("[startCall]", e);
      alert(e?.message ?? "Call start failed");
    }
  };

  const acceptCall = async () => {
    if (!user?.id || !openIncoming) return;

    const { data: offerSignal } = await (supabase as any)
      .from("orbit_call_signals")
      .select("*")
      .eq("session_id", openIncoming.id)
      .eq("signal_type", "offer")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!offerSignal) return;

    const peerUserIdResolved =
      offerSignal.sender_user_id === user.id
        ? openIncoming.callee_user_id
        : offerSignal.sender_user_id;

    try {
      assertCallReady({ video: openIncoming.call_type === "video" });

      const manager = await serviceRef.current.acceptIncomingCall({
        sessionId: openIncoming.id,
        myUserId: user.id,
        peerUserId: peerUserIdResolved,
        callType: openIncoming.call_type,
        remoteOffer: offerSignal.payload,
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = manager.getLocalStream();
        localVideoRef.current.muted = true;
        localVideoRef.current.playsInline = true;
        await localVideoRef.current.play().catch(() => {});
      }

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = manager.getRemoteStream();
        remoteVideoRef.current.playsInline = true;
      }

      setCurrentSession(openIncoming);
    } catch (e: any) {
      console.error("[acceptCall]", e);
      alert(e?.message ?? "Call accept failed");
    }
  };

  const rejectCall = async () => {
    if (!user?.id || !openIncoming) return;

    const peerUserIdResolved =
      openIncoming.caller_user_id === user.id
        ? openIncoming.callee_user_id
        : openIncoming.caller_user_id;

    await serviceRef.current.rejectIncomingCall({
      sessionId: openIncoming.id,
      myUserId: user.id,
      peerUserId: peerUserIdResolved,
    });

    setCurrentSession(null);
  };

  const hangup = async () => {
    if (!user?.id || !currentSession) return;

    const peerUserIdResolved =
      currentSession.caller_user_id === user.id
        ? currentSession.callee_user_id
        : currentSession.caller_user_id;

    await serviceRef.current.hangup({
      sessionId: currentSession.id,
      myUserId: user.id,
      peerUserId: peerUserIdResolved,
    });

    setCurrentSession(null);

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  useEffect(() => {
    debugLog.info("call", "call_test_page_loaded", "OrbitCallTestPage mounted");
    return () => {
      serviceRef.current.getManager()?.destroy();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading call test...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-destructive">Authentication required to test calls.</p>
      </div>
    );
  }

  const showIncomingModal =
    !!openIncoming &&
    openIncoming.status === "ringing" &&
    openIncoming.callee_user_id === user?.id;

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Orbit Call Test</h1>
        <p className="text-sm text-muted-foreground">
          Realtime call signaling + WebRTC
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <input
          value={peerUserId}
          onChange={(e) => setPeerUserId(e.target.value)}
          placeholder="Peer user ID"
          className="max-w-xs border border-border bg-background rounded-lg px-3 py-2 text-sm"
        />

        <button
          onClick={() => setCallType("audio")}
          className={`rounded-lg px-4 py-2 text-sm border ${
            callType === "audio" ? "bg-primary text-primary-foreground" : "bg-background"
          }`}
        >
          Audio
        </button>

        <button
          onClick={() => setCallType("video")}
          className={`rounded-lg px-4 py-2 text-sm border ${
            callType === "video" ? "bg-primary text-primary-foreground" : "bg-background"
          }`}
        >
          Video
        </button>

        <button onClick={startCall} className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium">
          Start Call
        </button>

        <button onClick={hangup} className="rounded-lg bg-destructive text-destructive-foreground px-4 py-2 text-sm font-medium">
          Hangup
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Local</p>
          <video ref={localVideoRef} autoPlay muted playsInline className="w-full aspect-video bg-muted rounded-xl" />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Remote</p>
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full aspect-video bg-muted rounded-xl" />
        </div>
      </div>

      <IncomingCallModal
        open={showIncomingModal}
        session={openIncoming}
        onAccept={acceptCall}
        onReject={rejectCall}
      />
    </div>
  );
}
