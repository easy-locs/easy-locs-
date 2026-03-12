/**
 * GuestCallDialog — In-call UI for guest WebRTC calls.
 * Shows local/remote video, mute/video toggles, end call.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Phone, PhoneOff, Mic, MicOff, Video, VideoOff,
  Loader2, Shield, X,
} from "lucide-react";
import { GuestCallManager, type CallStatus } from "@/lib/guest-call";

interface GuestCallDialogProps {
  open: boolean;
  onClose: () => void;
  callManager: GuestCallManager | null;
  providerName: string;
  serviceTitle?: string;
}

export default function GuestCallDialog({
  open, onClose, callManager, providerName, serviceTitle,
}: GuestCallDialogProps) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (status === "active") {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  // Listen to callManager state changes
  const handleStateChange = useCallback((state: Record<string, unknown>) => {
    if (state.status) setStatus(state.status as CallStatus);
    if (state.localStream !== undefined) setLocalStream(state.localStream as MediaStream | null);
    if (state.remoteStream !== undefined) setRemoteStream(state.remoteStream as MediaStream | null);
  }, []);

  // Expose state handler to parent via effect
  useEffect(() => {
    if (callManager) {
      (callManager as any).onStateChange = handleStateChange;
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

  const handleToggleVideo = () => {
    const isOff = callManager?.toggleVideo();
    setVideoOff(!!isOff);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const statusLabel: Record<CallStatus, string> = {
    idle: "",
    requesting: "Requesting call...",
    ringing: "Ringing...",
    connecting: "Connecting...",
    active: formatTime(elapsed),
    ended: "Call ended",
    declined: "Call declined",
    failed: "Call failed",
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleEndCall()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border">
        {/* Header */}
        <div className="p-4 text-center border-b border-border">
          <p className="font-semibold text-foreground">{providerName}</p>
          {serviceTitle && (
            <p className="text-xs text-muted-foreground truncate">{serviceTitle}</p>
          )}
          <div className="flex items-center justify-center gap-2 mt-1">
            <Badge variant="outline" className="gap-1 text-[10px]">
              <Shield className="h-2.5 w-2.5 text-green-500" />
              Encrypted
            </Badge>
            <span className="text-sm text-muted-foreground">
              {status === "ringing" || status === "requesting" ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {statusLabel[status]}
                </span>
              ) : (
                statusLabel[status]
              )}
            </span>
          </div>
        </div>

        {/* Video area */}
        <div className="relative aspect-video bg-muted/50 min-h-[200px]">
          {/* Remote video (full) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

          {/* No remote yet placeholder */}
          {!remoteStream && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              <Phone className="h-12 w-12 mb-2 opacity-30" />
              {status === "ringing" && <p className="text-sm animate-pulse">Waiting for answer...</p>}
              {status === "connecting" && <p className="text-sm animate-pulse">Connecting...</p>}
              {(status === "declined" || status === "ended") && (
                <p className="text-sm">{statusLabel[status]}</p>
              )}
            </div>
          )}

          {/* Local video (PiP) */}
          {localStream && localStream.getVideoTracks().length > 0 && (
            <div className="absolute bottom-3 right-3 w-24 h-32 rounded-lg overflow-hidden border-2 border-background shadow-lg">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className={`rounded-full h-12 w-12 ${muted ? "bg-destructive/10 text-destructive" : ""}`}
            onClick={handleToggleMute}
            disabled={status !== "active"}
          >
            {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>

          <Button
            variant="destructive"
            size="icon"
            className="rounded-full h-14 w-14"
            onClick={handleEndCall}
          >
            <PhoneOff className="h-6 w-6" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className={`rounded-full h-12 w-12 ${videoOff ? "bg-destructive/10 text-destructive" : ""}`}
            onClick={handleToggleVideo}
            disabled={status !== "active"}
          >
            {videoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
