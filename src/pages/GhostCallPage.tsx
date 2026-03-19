/**
 * GhostCallPage — Anonymous WebRTC call with media tracks.
 */
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
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("initializing");

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        pcRef.current = pc;

        // Set up remote audio playback
        const remoteStream = new MediaStream();
        pc.ontrack = (event) => {
          for (const track of event.streams[0].getTracks()) {
            remoteStream.addTrack(track);
          }
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remoteStream;
            remoteAudioRef.current.play().catch(() => {});
          }
        };

        // Get local media BEFORE creating offer
        const localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        localStreamRef.current = localStream;

        // Add tracks to peer connection
        for (const track of localStream.getTracks()) {
          pc.addTrack(track, localStream);
        }

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

        if (mounted) setStatus("ready");
      } catch (err: any) {
        console.error("[GhostCallPage] init error:", err);
        if (mounted) setStatus(`error: ${err?.message ?? "unknown"}`);
      }
    })();

    return () => {
      mounted = false;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
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
    setStatus("calling...");
    await startGhostOffer({
      callSessionId: callId,
      participantId,
      pc: pcRef.current,
    });
    setStatus("offer sent — waiting for answer");
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ghost Call</CardTitle>
          <p className="text-sm text-muted-foreground">
            Sealed signaling · anonymous transport · stealth routing
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={startCall}
            className="w-full"
            disabled={status !== "ready"}
          >
            {status === "ready" ? "Start ghost call" : status}
          </Button>
          <p className="text-xs text-muted-foreground">
            call: {callId ?? "creating..."} · participant:{" "}
            {participantId ?? "joining..."}
          </p>
          {/* Hidden audio element for remote playback */}
          <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
        </CardContent>
      </Card>
    </div>
  );
}
