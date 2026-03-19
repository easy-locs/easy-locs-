/**
 * OrbitCallRoot — Global Orbit call wiring.
 * Uses the unified coordinator + call-store for state management.
 * Mounts at app root so incoming calls ring on every page.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useGlobalCallController } from "@/hooks/useGlobalCallController";
import { supabase } from "@/integrations/supabase/client";
import IncomingCallModal from "@/components/calls/IncomingCallModal";

export default function OrbitCallRoot() {
  const { user } = useAuth();
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
    if (!user?.id) return;

    const loadIncoming = async () => {
      const { data } = await (supabase as any)
        .from("orbit_call_sessions")
        .select("*")
        .eq("callee_user_id", user.id)
        .eq("status", "ringing")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setIncomingSession(data ?? null);
    };

    loadIncoming();

    const channel = supabase
      .channel(`incoming-sessions:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orbit_call_sessions",
          filter: `callee_user_id=eq.${user.id}`,
        },
        loadIncoming
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

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
    if (!user?.id || !incomingSession) return;

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
      myUserId: user.id,
      peerUserId: incomingSession.caller_user_id,
      callType: incomingSession.call_type,
      remoteOffer: offerSignal.payload,
    });

    setIncomingSession(null);
  }, [user?.id, incomingSession, acceptIncomingCall]);

  const handleReject = useCallback(async () => {
    if (!user?.id || !incomingSession) return;

    await rejectIncomingCall({
      sessionId: incomingSession.id,
      myUserId: user.id,
      peerUserId: incomingSession.caller_user_id,
    });

    setIncomingSession(null);
  }, [user?.id, incomingSession, rejectIncomingCall]);

  const showIncoming =
    !!incomingSession &&
    incomingSession.status === "ringing" &&
    incomingSession.callee_user_id === user?.id;

  return (
    <>
      <audio ref={remoteAudioRef} hidden />
      <IncomingCallModal
        open={showIncoming}
        session={incomingSession}
        onAccept={handleAccept}
        onReject={handleReject}
      />
    </>
  );
}
