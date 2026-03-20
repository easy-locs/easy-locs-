import { useCallStore } from "@/stores/callStore";
import { useIncomingCallStore } from "@/stores/incomingCallStore";
import { Phone, PhoneOff } from "lucide-react";

export function IncomingCallModal() {
  const incoming = useCallStore((s) => s.incoming);
  const incomingInfo = useIncomingCallStore((s) => s.incoming);
  const acceptCall = useCallStore((s) => s.acceptCall);
  const rejectCall = useCallStore((s) => s.rejectCall);
  const clearIncoming = useIncomingCallStore((s) => s.clearIncoming);

  if (!incoming && !incomingInfo) return null;

  const sessionId = incoming?.id ?? incomingInfo?.sessionId ?? "";
  const callerLabel = incoming?.caller_orbit_id?.slice(0, 16) ?? incomingInfo?.callerOrbitId?.slice(0, 16) ?? "Unknown";
  const callType = incoming?.call_type === "video" ? "Video" : "Audio";
  const conversationId = incoming?.conversation_id ?? undefined;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card border border-border rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl space-y-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <Phone className="w-8 h-8 text-primary" />
          </div>

          <div className="text-center space-y-1">
            <p className="text-lg font-semibold text-foreground">Incoming {callType} Call</p>
            <p className="text-sm text-muted-foreground">From: {callerLabel}…</p>
          </div>

          <div className="flex gap-4 w-full">
            <button
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 transition-colors active:scale-[0.97]"
              onClick={async () => {
                await rejectCall(sessionId, conversationId);
                clearIncoming();
              }}
            >
              <PhoneOff className="w-4 h-4" />
              Reject
            </button>

            <button
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-emerald-700 transition-colors active:scale-[0.97]"
              onClick={async () => {
                await acceptCall(sessionId, conversationId);
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
