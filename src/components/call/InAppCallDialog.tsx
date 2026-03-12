/**
 * InAppCallDialog — Full in-app call UI (caller & callee).
 * Shows call status, mute/speaker/end controls, timer.
 * Mobile-first design with bottom-sheet feel.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX,
  Loader2, Shield, MessageSquare, WifiOff, User,
} from "lucide-react";
import { CallManager, type CallStatus, type CallState } from "@/lib/call-manager";

interface InAppCallDialogProps {
  open: boolean;
  onClose: () => void;
  callManager: CallManager | null;
  peerName: string;
  contextLabel?: string;
  onFallbackChat?: () => void;
}

export default function InAppCallDialog({
  open, onClose, callManager, peerName, contextLabel, onFallbackChat,
}: InAppCallDialogProps) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [muted, setMuted] = useState(false);
  const [speakerOff, setSpeakerOff] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [usingRelay, setUsingRelay] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleStateChange = useCallback((state: Partial<CallState>) => {
    if (state.status !== undefined) setStatus(state.status);
    if (state.elapsed !== undefined) setElapsed(state.elapsed);
    if (state.usingRelay !== undefined) setUsingRelay(state.usingRelay);
    if (state.error !== undefined) setError(state.error);
    if (state.remoteStream !== undefined) setRemoteStream(state.remoteStream);
  }, []);

  useEffect(() => {
    if (callManager) {
      callManager.onStateChange = handleStateChange;
    }
  }, [callManager, handleStateChange]);

  const handleEndCall = async () => {
    await callManager?.endCall();
    onClose();
  };

  const handleToggleMute = () => {
    const isMuted = callManager?.toggleMute();
    setMuted(!!isMuted);
  };

  const handleToggleSpeaker = () => {
    setSpeakerOff((prev) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.muted = !prev;
      }
      return !prev;
    });
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const isNetworkBlocked = status === "network_blocked" || status === "failed";

  const statusConfig: Record<string, { label: string; icon?: React.ReactNode }> = {
    idle: { label: "" },
    ringing: { label: "Ringing...", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
    connecting: { label: "Connecting...", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
    active: { label: formatTime(elapsed) },
    ended: { label: "Call ended" },
    declined: { label: "Call declined" },
    missed: { label: "No answer" },
    failed: { label: "Call failed" },
    network_blocked: { label: "Network restricted" },
  };

  const current = statusConfig[status] || statusConfig.idle;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleEndCall()}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border">
        {/* Hidden audio element for remote stream */}
        <audio ref={remoteAudioRef} autoPlay playsInline />

        {/* Call header */}
        <div className="pt-8 pb-4 px-6 text-center">
          {/* Avatar placeholder */}
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <User className="h-10 w-10 text-primary/60" />
          </div>

          <p className="text-lg font-semibold text-foreground">{peerName}</p>
          {contextLabel && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{contextLabel}</p>
          )}

          <div className="flex items-center justify-center gap-2 mt-3">
            {usingRelay && status === "active" && (
              <Badge variant="outline" className="gap-1 text-[10px] text-amber-600 border-amber-300">
                Relay
              </Badge>
            )}
            <Badge variant="outline" className="gap-1 text-[10px]">
              <Shield className="h-2.5 w-2.5 text-green-500" />
              Encrypted
            </Badge>
          </div>

          <div className="mt-3 text-sm text-muted-foreground flex items-center justify-center gap-1.5">
            {current.icon}
            <span className={status === "active" ? "font-mono text-foreground font-medium" : ""}>
              {current.label}
            </span>
          </div>
        </div>

        {/* Network blocked fallback */}
        {isNetworkBlocked && (
          <div className="px-6 pb-6 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <WifiOff className="h-6 w-6 text-destructive" />
            </div>
            <p className="text-xs text-muted-foreground">
              {error || "Your network may restrict internet calls."}
            </p>
            {onFallbackChat && (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => { handleEndCall(); onFallbackChat(); }}
              >
                <MessageSquare className="h-4 w-4" />
                Switch to chat
              </Button>
            )}
            <Button variant="outline" onClick={handleEndCall} className="w-full">
              Close
            </Button>
          </div>
        )}

        {/* Call controls */}
        {!isNetworkBlocked && (
          <div className="px-6 pb-8 pt-4">
            <div className="flex items-center justify-center gap-6">
              {/* Mute */}
              <button
                onClick={handleToggleMute}
                disabled={status !== "active"}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                  muted
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted text-foreground hover:bg-muted/80"
                } disabled:opacity-40`}
              >
                {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>

              {/* End call */}
              <button
                onClick={handleEndCall}
                className="w-16 h-16 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 transition-colors shadow-lg"
              >
                <PhoneOff className="h-6 w-6" />
              </button>

              {/* Speaker */}
              <button
                onClick={handleToggleSpeaker}
                disabled={status !== "active"}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                  speakerOff
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted text-foreground hover:bg-muted/80"
                } disabled:opacity-40`}
              >
                {speakerOff ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
            </div>

            {/* Labels */}
            <div className="flex items-center justify-center gap-6 mt-2">
              <span className="text-[10px] text-muted-foreground w-14 text-center">
                {muted ? "Unmute" : "Mute"}
              </span>
              <span className="text-[10px] text-destructive w-16 text-center font-medium">
                End
              </span>
              <span className="text-[10px] text-muted-foreground w-14 text-center">
                Speaker
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
