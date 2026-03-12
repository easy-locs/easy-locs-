/**
 * IncomingCallDialog — Shows when another user is calling.
 * Accept / Decline buttons with ring animation.
 */
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Phone, PhoneOff, Shield, User, MapPin } from "lucide-react";

interface IncomingCallDialogProps {
  open: boolean;
  callerName: string;
  contextLabel?: string;
  isVideo: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingCallDialog({
  open, callerName, contextLabel, isVideo, onAccept, onDecline,
}: IncomingCallDialogProps) {
  const [ringTime, setRingTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (open) {
      setRingTime(0);
      timerRef.current = setInterval(() => setRingTime((t) => t + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [open]);

  // Auto-decline after 30 seconds (missed call)
  useEffect(() => {
    if (ringTime >= 30 && onMissed) {
      onMissed();
    } else if (ringTime >= 30) {
      onDecline();
    }
  }, [ringTime, onDecline, onMissed]);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-sm text-center" onPointerDownOutside={(e) => e.preventDefault()}>
        <div className="flex flex-col items-center gap-4 py-6">
          {/* Ring animation */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
            <div className="absolute inset-[-8px] rounded-full bg-green-500/10 animate-pulse" />
            <div className="relative w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center">
              <Phone className="h-8 w-8 text-green-500 animate-bounce" />
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
              Incoming {isVideo ? "video" : "voice"} call
            </p>
            <div className="flex items-center justify-center gap-1.5">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg font-semibold text-foreground">{callerName}</span>
            </div>
            {contextLabel && (
              <div className="flex items-center justify-center gap-1 mt-1 text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span className="text-xs">{contextLabel}</span>
              </div>
            )}
          </div>

          <Badge variant="outline" className="gap-1 text-[10px]">
            <Shield className="h-2.5 w-2.5 text-green-500" />
            Encrypted call via Easy-Locs
          </Badge>

          <div className="flex gap-6 mt-4">
            <button
              onClick={onDecline}
              className="w-16 h-16 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 transition-colors shadow-lg"
            >
              <PhoneOff className="h-6 w-6" />
            </button>
            <button
              onClick={onAccept}
              className="w-16 h-16 rounded-full bg-green-600 text-white flex items-center justify-center hover:bg-green-700 transition-colors shadow-lg"
            >
              <Phone className="h-6 w-6" />
            </button>
          </div>
          <div className="flex gap-6">
            <span className="text-[10px] text-muted-foreground w-16 text-center">Decline</span>
            <span className="text-[10px] text-green-600 w-16 text-center font-medium">Accept</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
