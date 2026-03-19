/**
 * OrbitCallRoot — Global Orbit call wiring.
 * Uses the unified coordinator + call-store for state management.
 * Mounts at app root so incoming calls ring on every page.
 * Defers heavy controller init until user is authenticated.
 */
import { useEffect, useRef, useState, useCallback, memo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useGlobalCallController } from "@/hooks/useGlobalCallController";
import { supabase } from "@/integrations/supabase/client";
import IncomingCallModal from "@/components/calls/IncomingCallModal";
import CallMediaStatus from "@/components/calls/CallMediaStatus";

function OrbitCallRoot() {
  const { user } = useAuth();

  // Don't initialize anything until user is authenticated
  if (!user?.id) return null;

  return <OrbitCallRootInner userId={user.id} />;
}

const OrbitCallRootInner = memo(function OrbitCallRootInner({ userId }: { userId: string }) {
  const {
    callState,
    acceptIncomingCall,
    rejectIncomingCall,
    getManager,
  } = useGlobalCallController();

  const [incomingSession, setIncomingSession] = useState<any>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Poll for ringing sessions targeting this user
  useEffect(() => {
    const loadIncoming = async () => {
      const { data } = await (supabase as any)
        .from("orbit_call_sessions")
        .select("*")
        .eq("callee_user_id", userId)
        .eq("status", "ringing")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setIncomingSession(data ?? null);
    };

    loadIncoming();

    const channel = supabase
      .channel(`incoming-sessions:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orbit_call_sessions",
          filter: `callee_user_id=eq.${userId}`,
        },
        loadIncoming
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Attach remote audio when call becomes active
  useEffect(() => {
    const manager = getManager();
    const remote = manager?.getRemoteStream?.();
    if (remote && remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remote;
      remoteAudioRef.current.autoplay = true;
      (remoteAudioRef.current as any).playsInline = true;
      remoteAudioRef.current.play().catch(() => {});
    }
  }, [callState, getManager]);

  const handleAccept = useCallback(async () => {
    if (!incomingSession) return;

    const { data: offerSignal } = await (supabase as any)
      .from("orbit_call_signals")
      .select("*")
      .eq("session_id", incomingSession.id)
      .eq("signal_type", "offer")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!offerSignal) return;

    await acceptIncomingCall({
      sessionId: incomingSession.id,
      myUserId: userId,
      peerUserId: incomingSession.caller_user_id,
      callType: incomingSession.call_type,
      remoteOffer: offerSignal.payload,
    });

    setIncomingSession(null);
  }, [userId, incomingSession, acceptIncomingCall]);

  const handleReject = useCallback(async () => {
    if (!incomingSession) return;

    await rejectIncomingCall({
      sessionId: incomingSession.id,
      myUserId: userId,
      peerUserId: incomingSession.caller_user_id,
    });

    setIncomingSession(null);
  }, [userId, incomingSession, rejectIncomingCall]);

  const showIncoming =
    !!incomingSession &&
    incomingSession.status === "ringing" &&
    incomingSession.callee_user_id === userId;

  const isInCall = callState?.state === "active" || callState?.state === "connecting";

  return (
    <>
      <audio ref={remoteAudioRef} hidden />
      {isInCall && (
        <div className="fixed top-2 right-2 z-50 rounded-xl border border-border bg-card/95 backdrop-blur-sm px-3 py-2 shadow-lg">
          <CallMediaStatus />
        </div>
      )}
      <IncomingCallModal
        open={showIncoming}
        session={incomingSession}
        onAccept={handleAccept}
        onReject={handleReject}
      />
    </>
  );
});

export default OrbitCallRoot;
