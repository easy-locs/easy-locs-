/**
 * OrbitCallTestPage — Full WebRTC call test with realtime signaling.
 */
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCallSignals } from "@/hooks/useCallSignals";
import { useIncomingCalls } from "@/hooks/useIncomingCalls";
import IncomingCallModal from "@/components/calls/IncomingCallModal";
import { OrbitCallService } from "@/lib/calls/call-service";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CallSessionRecord, CallSignalRecord, CallType } from "@/lib/calls/call-types";

export default function OrbitCallTestPage() {
  const { user } = useAuth();
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

    const { session, manager } = await serviceRef.current.startOutgoingCall({
      callerUserId: user.id,
      calleeUserId: peerUserId,
      callType,
    });

    setCurrentSession(session);

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = manager.getRemoteStream();
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

    const manager = await serviceRef.current.acceptIncomingCall({
      sessionId: openIncoming.id,
      myUserId: user.id,
      peerUserId: peerUserIdResolved,
      callType: openIncoming.call_type,
      remoteOffer: offerSignal.payload,
    });

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = manager.getRemoteStream();
    }

    setCurrentSession(openIncoming);
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
  };

  useEffect(() => {
    return () => {
      serviceRef.current.getManager()?.destroy();
    };
  }, []);

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
        <Input
          placeholder="Peer user ID"
          value={peerUserId}
          onChange={(e) => setPeerUserId(e.target.value)}
          className="max-w-xs"
        />
        <Button
          variant={callType === "audio" ? "default" : "outline"}
          size="sm"
          onClick={() => setCallType("audio")}
        >
          Audio
        </Button>
        <Button
          variant={callType === "video" ? "default" : "outline"}
          size="sm"
          onClick={() => setCallType("video")}
        >
          Video
        </Button>
        <Button onClick={startCall}>Start Call</Button>
        <Button variant="destructive" onClick={hangup}>
          Hangup
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Local</p>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full aspect-video bg-muted rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Remote</p>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full aspect-video bg-muted rounded-xl"
          />
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
