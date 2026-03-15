/**
 * IncomingGuestCallDialog — Seller-side incoming call notification.
 * Shows guest name, listing context, accept/decline buttons.
 */
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Phone, PhoneOff, Video, Shield, User, MapPin,
} from "lucide-react";
import { startRingtone, stopRingtone } from "@/lib/ringtone";

interface IncomingGuestCallDialogProps {
  open: boolean;
  callId: string;
  guestName: string;
  contextLabel?: string;
  isVideo: boolean;
  onAccept: (callId: string) => void;
  onDecline: (callId: string) => void;
}

export default function IncomingGuestCallDialog({
  open, callId, guestName, contextLabel, isVideo, onAccept, onDecline,
}: IncomingGuestCallDialogProps) {
  const [ringTime, setRingTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (open) {
      setRingTime(0);
      timerRef.current = setInterval(() => setRingTime((t) => t + 1), 1000);
      startRingtone(isVideo ? "video" : "audio");
    } else {
      stopRingtone();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopRingtone();
    };
  }, [open, isVideo]);

  // Auto-decline after 30 seconds
  useEffect(() => {
    if (ringTime >= 30) {
      stopRingtone();
      onDecline(callId);
    }
  }, [ringTime, callId, onDecline]);

  const handleAccept = () => {
    stopRingtone();
    onAccept(callId);
  };

  const handleDecline = () => {
    stopRingtone();
    onDecline(callId);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-sm text-center" onPointerDownOutside={(e) => e.preventDefault()}>
        <div className="flex flex-col items-center gap-4 py-4">
          {/* Animated ring indicator */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
            <div className="relative w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center">
              {isVideo ? (
                <Video className="h-7 w-7 text-green-500" />
              ) : (
                <Phone className="h-7 w-7 text-green-500 animate-bounce" />
              )}
            </div>
          </div>

          <div>
            <p className="text-lg font-semibold text-foreground">
              Incoming {isVideo ? "video" : "audio"} call
            </p>
            <div className="flex items-center justify-center gap-1 mt-1 text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span className="text-sm font-medium">{guestName}</span>
            </div>
            {contextLabel && (
              <div className="flex items-center justify-center gap-1 mt-0.5 text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span className="text-xs">{contextLabel}</span>
              </div>
            )}
          </div>

          <Badge variant="outline" className="gap-1 text-[10px]">
            <Shield className="h-2.5 w-2.5 text-green-500" />
            Encrypted guest call
          </Badge>

          <div className="flex gap-4 mt-2">
            <Button
              variant="destructive"
              size="lg"
              className="rounded-full gap-2 px-6"
              onClick={() => onDecline(callId)}
            >
              <PhoneOff className="h-5 w-5" />
              Decline
            </Button>
            <Button
              size="lg"
              className="rounded-full gap-2 px-6 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => onAccept(callId)}
            >
              <Phone className="h-5 w-5" />
              Accept
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
