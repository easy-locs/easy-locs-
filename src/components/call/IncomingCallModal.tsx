/**
 * IncomingCallModal — Unified incoming call UI with premium ringtone + vibration.
 * Uses Web Audio API ringtone (no external audio files needed).
 */
import { useEffect } from "react";
import { useCallStore } from "@/stores/callStore";
import { useIncomingCallStore } from "@/stores/incomingCallStore";
import { Phone, PhoneOff, Video } from "lucide-react";
import {
  startRingtone,
  stopRingtone,
  playCallConnectedTone,
} from "@/lib/calls/call-ringtone";

export function IncomingCallModal() {
  const incoming = useCallStore((s) => s.incoming);
  const incomingInfo = useIncomingCallStore((s) => s.incoming);
  const acceptCall = useCallStore((s) => s.acceptCall);
  const rejectCall = useCallStore((s) => s.rejectCall);
  const clearIncoming = useIncomingCallStore((s) => s.clearIncoming);

  const isVisible = !!(incoming || incomingInfo);
  const isVideo = incoming?.call_type === "video" || incomingInfo?.mode === "video";

  // Ringtone lifecycle — play while visible, stop on dismiss
  useEffect(() => {
    if (isVisible) {
      startRingtone();
    } else {
      stopRingtone();
    }
    return () => stopRingtone();
  }, [isVisible]);

  if (!isVisible) return null;

  const sessionId = incoming?.id ?? incomingInfo?.sessionId ?? "";
  const callerLabel = incoming?.caller_orbit_id?.slice(0, 16) ?? incomingInfo?.callerOrbitId?.slice(0, 16) ?? "Unknown";
  const conversationId = incoming?.conversation_id ?? undefined;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card border border-border rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl space-y-6">
        <div className="flex flex-col items-center gap-4">
          {/* Pulsing icon */}
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            {isVideo ? (
              <Video className="w-9 h-9 text-primary" />
            ) : (
              <Phone className="w-9 h-9 text-primary" />
            )}
          </div>

          <div className="text-center space-y-1">
            <p className="text-lg font-semibold text-foreground">
              Incoming {isVideo ? "Video" : "Voice"} Call
            </p>
            <p className="text-sm text-muted-foreground">From: {callerLabel}…</p>
          </div>

          <div className="flex gap-4 w-full">
            <button
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-3 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 transition-colors active:scale-[0.97]"
              onClick={async () => {
                stopRingtone();
                await rejectCall(sessionId, conversationId);
                clearIncoming();
              }}
            >
              <PhoneOff className="w-4 h-4" />
              Reject
            </button>

            <button
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-emerald-700 transition-colors active:scale-[0.97]"
              onClick={async () => {
                stopRingtone();
                playCallConnectedTone();
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
