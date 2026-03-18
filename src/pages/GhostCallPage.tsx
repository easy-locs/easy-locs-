import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  addGhostCallParticipant,
  createGhostCallSession,
  updateGhostCallParticipant,
} from "@/lib/orbit/ghost-calls";
import { startGhostOffer, useGhostRTC } from "@/hooks/useGhostRTC";

export default function GhostCallPage() {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      pcRef.current = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      const call = await createGhostCallSession({
        callType: "audio",
        anonymityLevel: "ghost",
        relayMode: "sealed",
      });
      if (!mounted) return;
      setCallId(call.id);

      const participant = await addGhostCallParticipant({
        callSessionId: call.id,
        role: "caller",
        transportIdentity: crypto.randomUUID(),
      });
      if (!mounted) return;
      setParticipantId(participant.id);

      await updateGhostCallParticipant(participant.id, {
        status: "joined",
        joinedAt: new Date().toISOString(),
      });
    })();

    return () => {
      mounted = false;
      pcRef.current?.close();
    };
  }, []);

  useGhostRTC({
    callSessionId: callId ?? undefined,
    participantId: participantId ?? undefined,
    pc: pcRef.current,
    isCaller: true,
  });

  const startCall = async () => {
    if (!callId || !participantId || !pcRef.current) return;
    await startGhostOffer({
      callSessionId: callId,
      participantId,
      pc: pcRef.current,
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ghost Call</CardTitle>
          <p className="text-sm text-muted-foreground">Sealed signaling · anonymous transport · stealth routing</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={startCall} className="w-full">Start ghost call</Button>
          <p className="text-xs text-muted-foreground">
            call: {callId ?? "creating..."} · participant: {participantId ?? "joining..."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
