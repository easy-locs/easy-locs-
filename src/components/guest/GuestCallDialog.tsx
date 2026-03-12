/**
 * GuestCallDialog — In-call UI for guest WebRTC calls.
 * Shows local/remote video, mute/video toggles, end call.
 * Includes graceful fallback UI for UAE/GCC network restrictions.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Phone, PhoneOff, Mic, MicOff, Video, VideoOff,
  Loader2, Shield, MessageSquare, ExternalLink, Wifi, WifiOff,
} from "lucide-react";
import { GuestCallManager, type CallStatus, type CallFailureReason } from "@/lib/guest-call";

interface GuestCallDialogProps {
  open: boolean;
  onClose: () => void;
  callManager: GuestCallManager | null;
  providerName: string;
  serviceTitle?: string;
  /** Fallback actions when call fails */
  onFallbackChat?: () => void;
  providerPhone?: string;
  providerWhatsApp?: string;
}

export default function GuestCallDialog({
  open, onClose, callManager, providerName, serviceTitle,
  onFallbackChat, providerPhone, providerWhatsApp,
}: GuestCallDialogProps) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [usingRelay, setUsingRelay] = useState(false);
  const [failureReason, setFailureReason] = useState<CallFailureReason | undefined>();
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

  const handleStateChange = useCallback((state: Record<string, unknown>) => {
    if (state.status) setStatus(state.status as CallStatus);
    if (state.localStream !== undefined) setLocalStream(state.localStream as MediaStream | null);
    if (state.remoteStream !== undefined) setRemoteStream(state.remoteStream as MediaStream | null);
    if (state.usingRelay !== undefined) setUsingRelay(state.usingRelay as boolean);
    if (state.failureReason !== undefined) setFailureReason(state.failureReason as CallFailureReason);
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

  const handleToggleVideo = () => {
    const isOff = callManager?.toggleVideo();
    setVideoOff(!!isOff);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const isNetworkBlocked = status === "network_blocked" || status === "failed";
  const showFallback = isNetworkBlocked && (onFallbackChat || providerPhone || providerWhatsApp);

  const statusLabel: Record<CallStatus, string> = {
    idle: "",
    requesting: "Requesting call...",
    ringing: "Ringing...",
    connecting: "Connecting...",
    active: formatTime(elapsed),
    ended: "Call ended",
    declined: "Call declined",
    failed: "Call failed",
    network_blocked: "Network restricted",
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
            {usingRelay && status === "active" && (
              <Badge variant="outline" className="gap-1 text-[10px] text-amber-600 border-amber-300">
                <Wifi className="h-2.5 w-2.5" />
                Relay
              </Badge>
            )}
            <Badge variant="outline" className="gap-1 text-[10px]">
              <Shield className="h-2.5 w-2.5 text-green-500" />
              Encrypted
            </Badge>
            <span className="text-sm text-muted-foreground">
              {status === "ringing" || status === "requesting" || status === "connecting" ? (
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

        {/* Network blocked / failure fallback */}
        {isNetworkBlocked && (
          <div className="p-5 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <WifiOff className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">
                {failureReason === "network_blocked" || failureReason === "ice_timeout"
                  ? "Internet calling unavailable"
                  : "Call connection failed"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {failureReason === "network_blocked" || failureReason === "ice_timeout"
                  ? "Your network may restrict internet calls. This is common on some mobile/Wi-Fi networks in certain regions."
                  : "The connection was lost. Please try again or use an alternative contact method."}
              </p>
            </div>

            {showFallback && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Continue via</p>
                {onFallbackChat && (
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => { handleEndCall(); onFallbackChat(); }}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Translated Chat
                  </Button>
                )}
                {providerWhatsApp && (
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => window.open(`https://wa.me/${providerWhatsApp.replace(/[^0-9]/g, "")}`, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4" />
                    WhatsApp
                  </Button>
                )}
                {providerPhone && (
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => window.open(`tel:${providerPhone}`, "_self")}
                  >
                    <Phone className="h-4 w-4" />
                    Phone Call
                  </Button>
                )}
              </div>
            )}

            {!showFallback && (
              <Button variant="outline" onClick={handleEndCall} className="mt-2">
                Close
              </Button>
            )}
          </div>
        )}

        {/* Video area — only when not network blocked */}
        {!isNetworkBlocked && (
          <>
            <div className="relative aspect-video bg-muted/50 min-h-[200px]">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />

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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
