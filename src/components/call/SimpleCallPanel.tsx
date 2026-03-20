import { useCallStore } from "@/stores/callStore";
import { useSimpleRtcStore } from "@/stores/simpleRtcStore";
import { useUiShellStore } from "@/stores/uiShellStore";

export function SimpleCallPanel() {
  const call = useCallStore();
  const rtc = useSimpleRtcStore();
  const setCallFullscreen = useUiShellStore((s) => s.setCallFullscreen);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 bg-background p-6">
      <h2 className="text-lg font-semibold text-foreground">Call Screen</h2>
      <p className="text-sm text-muted-foreground">Mode: {call.mode}</p>
      <p className="text-sm text-muted-foreground">Type: {call.type ?? "none"}</p>
      <p className="text-sm text-muted-foreground">Peer: {call.peerOrbitId ?? "none"}</p>

      <div className="flex gap-2">
        <button
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          onClick={() => void rtc.initLocalMedia(call.type === "video" ? "video" : "audio")}
        >
          Init Media
        </button>
        <button
          className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors"
          onClick={() => {
            rtc.cleanup();
            call.endCall();
            setCallFullscreen(false);
          }}
        >
          End Call
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Local media initialized: {rtc.isInitialized ? "yes" : "no"}
      </p>
    </div>
  );
}
