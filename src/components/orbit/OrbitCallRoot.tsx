/**
 * OrbitCallRoot — Global Orbit call wiring.
 * Mounts useIncomingCalls + useCallSignals at app root level
 * so incoming calls ring everywhere, not just on the test page.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useIncomingCalls } from "@/hooks/useIncomingCalls";
import { useCallSignals } from "@/hooks/useCallSignals";
import { OrbitCallService } from "@/lib/calls/call-service";
import { supabase } from "@/integrations/supabase/client";
import { startRingTimeout, clearRingTimeout, clearAllRingTimeouts } from "@/lib/orbit/call-timeout";
import IncomingCallModal from "@/components/calls/IncomingCallModal";
import type { CallSignalRecord, CallSessionRecord } from "@/lib/calls/call-types";

export default function OrbitCallRoot() {
  const { user } = useAuth();
  const serviceRef = useRef(new OrbitCallService());
  const [ringingSession, setRingingSession] = useState<CallSessionRecord | null>(null);

  const { incoming } = useIncomingCalls(user?.id ?? null);

  // Start ring timeout for each new incoming call
  useEffect(() => {
    if (!incoming.length) {
      setRingingSession(null);
      return;
    }
    const top = incoming[0];
    setRingingSession(top);
    startRingTimeout(top.id, () => setRingingSession(null));
    return () => clearRingTimeout(top.id);
  }, [incoming]);

  // Listen for signals globally (answer, ice, hangup, reject)
  useCallSignals({
    userId: user?.id ?? null,
    onSignal: async (signal: CallSignalRecord) => {
      const service = serviceRef.current;

      if (signal.signal_type === "offer") {
        return;
      }

      if (signal.signal_type === "reject" || signal.signal_type === "hangup") {
        setRingingSession(null);
      }

      await service.handleSignal(signal);
    },
  });

  const handleAccept = useCallback(async () => {
    if (!user?.id || !ringingSession) return;

    clearRingTimeout(ringingSession.id);

    const { data: offerSignal } = await (supabase as any)
      .from("orbit_call_signals")
      .select("*")
      .eq("session_id", ringingSession.id)
      .eq("signal_type", "offer")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!offerSignal) return;

    const peerUserId =
      offerSignal.sender_user_id === user.id
        ? ringingSession.callee_user_id
        : offerSignal.sender_user_id;

    await serviceRef.current.acceptIncomingCall({
      sessionId: ringingSession.id,
      myUserId: user.id,
      peerUserId,
      callType: ringingSession.call_type,
      remoteOffer: offerSignal.payload as RTCSessionDescriptionInit,
    });

    setRingingSession(null);
  }, [user?.id, ringingSession]);

  const handleReject = useCallback(async () => {
    if (!user?.id || !ringingSession) return;

    clearRingTimeout(ringingSession.id);

    const peerUserId =
      ringingSession.caller_user_id === user.id
        ? ringingSession.callee_user_id
        : ringingSession.caller_user_id;

    await serviceRef.current.rejectIncomingCall({
      sessionId: ringingSession.id,
      myUserId: user.id,
      peerUserId,
    });

    setRingingSession(null);
  }, [user?.id, ringingSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      serviceRef.current.getManager()?.destroy();
      clearAllRingTimeouts();
    };
  }, []);

  const showModal =
    !!ringingSession &&
    ringingSession.status === "ringing" &&
    ringingSession.callee_user_id === user?.id;

  return (
    <IncomingCallModal
      open={showModal}
      session={ringingSession}
      onAccept={handleAccept}
      onReject={handleReject}
    />
  );
}
