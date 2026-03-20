import { useCallStore } from "@/stores/callStore";
import { useCallSignalingStore } from "@/stores/callSignalingStore";
import { useIncomingCallStore } from "@/stores/incomingCallStore";
import { Phone, PhoneOff } from "lucide-react";

export function IncomingCallModal() {
  const incoming = useIncomingCallStore((s) => s.incoming);
  const clearIncoming = useIncomingCallStore((s) => s.clearIncoming);
  const acceptCall = useCallStore((s) => s.setActive);

  if (!incoming) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card border border-border rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl space-y-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <Phone className="w-8 h-8 text-primary" />
          </div>

          <div className="text-center space-y-1">
            <p className="text-lg font-semibold text-foreground">Incoming Call</p>
            <p className="text-sm text-muted-foreground">
              From: {incoming.callerOrbitId?.slice(0, 16) ?? "Unknown"}…
            </p>
          </div>

          <div className="flex gap-4 w-full">
            <button
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 transition-colors active:scale-[0.97]"
              onClick={async () => {
                await useCallSignalingStore
                  .getState()
                  .sendSignal("hangup", incoming.callerOrbitId, { reason: "rejected" });
                clearIncoming();
              }}
            >
              <PhoneOff className="w-4 h-4" />
              Reject
            </button>

            <button
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-emerald-700 transition-colors active:scale-[0.97]"
              onClick={() => {
                acceptCall();
                clearIncoming();
              }}
            >
              <Phone className="w-4 h-4" />
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
