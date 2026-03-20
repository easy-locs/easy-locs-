import { useCallStore } from "@/stores/callStore";
import { useUiShellStore } from "@/stores/uiShellStore";
import { useRealtimeCallStore } from "@/stores/realtimeCallStore";
import { useSimpleRtcStore } from "@/stores/simpleRtcStore";
import { useEffect, useRef } from "react";

export function RealtimeCallPanel() {
  const call = useCallStore();
  const setCallFullscreen = useUiShellStore((s) => s.setCallFullscreen);
  const hangup = useRealtimeCallStore((s) => s.hangup);
  const localStream = useSimpleRtcStore((s) => s.localStream);
  const remoteStream = useSimpleRtcStore((s) => s.remoteStream);

  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localRef.current && localStream) {
      localRef.current.srcObject = localStream;
      void localRef.current.play().catch(() => undefined);
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteRef.current && remoteStream) {
      remoteRef.current.srcObject = remoteStream;
      void remoteRef.current.play().catch(() => undefined);
    }
  }, [remoteStream]);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Realtime Call</h3>
      <p className="text-xs text-muted-foreground">Mode: {call.mode}</p>
      <p className="text-xs text-muted-foreground">Type: {call.type ?? "none"}</p>
      <p className="text-xs text-muted-foreground">Peer: {call.peerOrbitId ?? "none"}</p>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground">Local</p>
          <video ref={localRef} muted playsInline className="w-full aspect-video rounded-lg bg-muted" />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground">Remote</p>
          <video ref={remoteRef} playsInline className="w-full aspect-video rounded-lg bg-muted" />
        </div>
      </div>

      <div className="flex justify-center">
        <button
          className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 transition-colors"
          onClick={() => void hangup().then(() => setCallFullscreen(false))}
        >
          End Call
        </button>
      </div>
    </div>
  );
}
