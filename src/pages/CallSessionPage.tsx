/**
 * CallSessionPage — Example full WebRTC call session with signaling + participants + translation overlay.
 */
import { useEffect, useRef, useState } from "react";
import { joinCallParticipant, leaveCallParticipant } from "@/lib/orbit/call-participants";
import { useOrbitRTCSignaling } from "@/hooks/useOrbitRTCSignaling";
import { startOutgoingCall } from "@/lib/orbit/start-call";
import { LiveCallOverlay } from "@/components/orbit/LiveCallOverlay";
import { BackCard } from "@/components/ui/back-card";
import { useAuth } from "@/contexts/AuthContext";
import { useParams } from "react-router-dom";

export default function CallSessionPage() {
  const { user } = useAuth();
  const { callSessionId } = useParams();
  const userId = user?.id ?? "";

  const [participantId, setParticipantId] = useState<string | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    if (!callSessionId || !userId) return;

    pcRef.current = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    joinCallParticipant({
      callSessionId,
      userId,
      role: "caller",
    }).then((p: any) => setParticipantId(p?.id ?? null));

    return () => {
      if (participantId) leaveCallParticipant(participantId);
      pcRef.current?.close();
    };
  }, [callSessionId, userId]);

  useOrbitRTCSignaling({
    callSessionId,
    pc: pcRef.current,
    userId,
    isCaller: true,
  });

  const start = async () => {
    if (!pcRef.current || !callSessionId) return;
    await startOutgoingCall({ pc: pcRef.current, callSessionId, userId });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <BackCard />
        <div>
          <h1 className="text-xl font-bold text-foreground">Call session</h1>
          <p className="text-sm text-muted-foreground">WebRTC call with signaling + translation</p>
        </div>

        <button
          onClick={start}
          className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
        >
          Start call
        </button>

        <LiveCallOverlay callSessionId={callSessionId} />
      </div>
    </div>
  );
}
