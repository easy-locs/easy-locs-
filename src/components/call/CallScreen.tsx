import { useEffect, useRef } from "react";
import { useCallStore } from "@/stores/callStore";
import { useCallSignalingStore } from "@/stores/callSignalingStore";
import { useSimpleRtcStore } from "@/stores/simpleRtcStore";
import { PhoneOff, Mic, MicOff } from "lucide-react";

export function CallScreen() {
  const mode = useCallStore((s) => s.mode);
  const type = useCallStore((s) => s.type);
  const peerOrbitId = useCallStore((s) => s.peerOrbitId);
  const endCall = useCallStore((s) => s.endCall);
  const localMicEnabled = useCallStore((s) => s.localMicEnabled);
  const toggleMic = useCallStore((s) => s.toggleMic);

  const remoteStream = useSimpleRtcStore((s) => s.remoteStream);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current && remoteStream) {
      audioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (mode === "idle" || mode === "ended") return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9990] w-[90vw] max-w-sm">
      <div className="bg-card border border-border rounded-2xl p-4 shadow-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {mode === "ringing" ? "Calling…" : mode === "connecting" ? "Connecting…" : "Call Active"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {peerOrbitId?.slice(0, 20)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleMic}
              className="rounded-full p-2 bg-accent text-accent-foreground hover:bg-accent/80 transition-colors active:scale-[0.95]"
            >
              {localMicEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>

            <button
              onClick={async () => {
                await useCallSignalingStore.getState().sendSignal(
                  "hangup",
                  peerOrbitId ?? "",
                  { reason: "user_ended" }
                );
                endCall();
              }}
              className="rounded-full p-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors active:scale-[0.95]"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        </div>

        <audio ref={audioRef} autoPlay playsInline className="hidden" />
      </div>
    </div>
  );
}
