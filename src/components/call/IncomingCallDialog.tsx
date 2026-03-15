/**
 * IncomingCallDialog — Premium incoming call experience.
 * Ringtone, vibration, elegant UI with caller context.
 * Fully i18n'd.
 */
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Phone, PhoneOff, Video, Shield, User, MapPin } from "lucide-react";
import { startRingtone, stopRingtone } from "@/lib/ringtone";
import { useI18n } from "@/lib/i18n";

interface IncomingCallDialogProps {
  open: boolean;
  callerName: string;
  contextLabel?: string;
  isVideo: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onMissed?: () => void;
}

export default function IncomingCallDialog({
  open, callerName, contextLabel, isVideo, onAccept, onDecline, onMissed,
}: IncomingCallDialogProps) {
  const { t } = useI18n();
  const [ringTime, setRingTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (open) {
      setRingTime(0);
      timerRef.current = setInterval(() => setRingTime((prev) => prev + 1), 1000);
      startRingtone(isVideo ? "video" : "audio");
    } else {
      stopRingtone();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopRingtone();
    };
  }, [open, isVideo]);

  useEffect(() => {
    if (ringTime >= 30) {
      stopRingtone();
      if (onMissed) onMissed();
      else onDecline();
    }
  }, [ringTime, onDecline, onMissed]);

  const handleAccept = () => { stopRingtone(); onAccept(); };
  const handleDecline = () => { stopRingtone(); onDecline(); };

  const titleLabel = isVideo
    ? (t("call.incoming.video_title") || "Incoming video call")
    : (t("call.incoming.title") || "Incoming call");

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-sm text-center border-none bg-gradient-to-b from-background via-background to-muted/50 backdrop-blur-xl"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="flex flex-col items-center gap-5 py-8">
          {/* Animated ring pulse */}
          <div className="relative">
            <div className="absolute inset-[-20px] rounded-full bg-green-500/10 animate-ping" style={{ animationDuration: "2s" }} />
            <div className="absolute inset-[-12px] rounded-full bg-green-500/8 animate-pulse" />
            <div className="absolute inset-[-4px] rounded-full border border-green-500/20 animate-pulse" style={{ animationDelay: "0.5s" }} />
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-green-500/15 to-green-600/10 border-2 border-green-500/30 flex items-center justify-center shadow-lg shadow-green-500/10">
              {isVideo ? (
                <Video className="h-9 w-9 text-green-500 animate-bounce" style={{ animationDuration: "1.5s" }} />
              ) : (
                <Phone className="h-9 w-9 text-green-500 animate-bounce" style={{ animationDuration: "1.5s" }} />
              )}
            </div>
          </div>

          {/* Call info */}
          <div className="space-y-1.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
              {titleLabel}
            </p>
            <div className="flex items-center justify-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-xl font-bold text-foreground">{callerName}</span>
            </div>
            {contextLabel && (
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span className="text-xs">{contextLabel}</span>
              </div>
            )}
          </div>

          {/* Security badge */}
          <Badge variant="outline" className="gap-1.5 text-[10px] px-3 py-1 border-green-500/20 bg-green-500/5">
            <Shield className="h-2.5 w-2.5 text-green-500" />
            <span className="text-green-600 dark:text-green-400">
              {t("call.label.e2e_encrypted") || "End-to-end encrypted"}
            </span>
          </Badge>

          {/* Timer */}
          <p className="text-[10px] text-muted-foreground/60 font-mono tabular-nums">{ringTime}s</p>

          {/* Action buttons */}
          <div className="flex gap-10 mt-2">
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleDecline}
                className="w-16 h-16 min-w-[64px] min-h-[64px] rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 transition-all shadow-lg shadow-destructive/20 active:scale-95"
              >
                <PhoneOff className="h-6 w-6" />
              </button>
              <span className="text-[10px] text-muted-foreground font-medium">
                {t("call.incoming.decline") || "Decline"}
              </span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleAccept}
                className="w-16 h-16 min-w-[64px] min-h-[64px] rounded-full bg-green-600 text-white flex items-center justify-center hover:bg-green-700 transition-all shadow-lg shadow-green-600/30 active:scale-95"
              >
                <Phone className="h-6 w-6" />
              </button>
              <span className="text-[10px] text-green-600 font-semibold">
                {t("call.incoming.accept") || "Accept"}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
