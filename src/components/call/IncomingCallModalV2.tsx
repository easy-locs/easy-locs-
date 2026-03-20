import { useIncomingCallStore } from "@/stores/incomingCallStore";
import { useRealtimeCallStore } from "@/stores/realtimeCallStore";
import { useCallSignalingStore } from "@/stores/callSignalingStore";
import { Phone, PhoneOff, Video } from "lucide-react";
import { Button } from "@/components/ui/button";

export function IncomingCallModalV2() {
  const incoming = useIncomingCallStore((s) => s.incoming);
  const clearIncoming = useIncomingCallStore((s) => s.clearIncoming);
  const acceptIncomingCall = useRealtimeCallStore((s) => s.acceptIncomingCall);

  if (!incoming) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card border border-border rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl space-y-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            {incoming.mode === "video" ? (
              <Video className="w-8 h-8 text-primary" />
            ) : (
              <Phone className="w-8 h-8 text-primary" />
            )}
          </div>

          <div className="text-center space-y-1">
            <p className="text-lg font-semibold text-foreground">
              Incoming {incoming.mode} call
            </p>
            <p className="text-sm text-muted-foreground">
              {incoming.callerOrbitId.slice(0, 16)}…
            </p>
          </div>

          <div className="flex gap-4 w-full">
            <Button
              variant="destructive"
              className="flex-1 gap-2"
              onClick={async () => {
                await useCallSignalingStore
                  .getState()
                  .sendSignal("hangup", incoming.callerOrbitId, { reason: "rejected" });
                clearIncoming();
              }}
            >
              <PhoneOff className="w-4 h-4" />
              Reject
            </Button>

            <Button
              className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-primary-foreground"
              onClick={() => {
                void acceptIncomingCall(
                  incoming.sessionId,
                  incoming.callerOrbitId,
                  incoming.mode
                );
                clearIncoming();
              }}
            >
              <Phone className="w-4 h-4" />
              Accept
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
