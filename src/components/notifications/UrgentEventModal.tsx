/**
 * UrgentEventModal — Full-screen takeover for urgent non-call events.
 * Used for: new seller order, driver mission, critical payment alert.
 * Sound + haptic + auto-dismiss after timeout.
 */
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { playSoundForType } from "@/lib/notifications/sounds";
import { haptic } from "@/lib/haptics";
import {
  ShoppingBag, Truck, CreditCard, AlertTriangle, X,
  ChevronRight, Bell,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

export interface UrgentEvent {
  id: string;
  type: "new_order" | "driver_mission" | "payment_alert" | "critical_alert";
  title: string;
  message: string;
  deepLink?: string;
  priority?: "high" | "critical";
  metadata?: Record<string, any>;
}

interface UrgentEventModalProps {
  event: UrgentEvent | null;
  onDismiss: () => void;
  autoTimeout?: number;
}

const TYPE_CONFIG: Record<string, { icon: typeof Bell; colorClass: string; bgClass: string }> = {
  new_order: { icon: ShoppingBag, colorClass: "text-green-500", bgClass: "bg-green-500/15" },
  driver_mission: { icon: Truck, colorClass: "text-blue-500", bgClass: "bg-blue-500/15" },
  payment_alert: { icon: CreditCard, colorClass: "text-amber-500", bgClass: "bg-amber-500/15" },
  critical_alert: { icon: AlertTriangle, colorClass: "text-destructive", bgClass: "bg-destructive/15" },
};

export default function UrgentEventModal({ event, onDismiss, autoTimeout = 30 }: UrgentEventModalProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (event) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
      playSoundForType(event.type);
      haptic(event.priority === "critical" ? "heavy" : "medium");
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [event?.id]);

  useEffect(() => {
    if (elapsed >= autoTimeout) onDismiss();
  }, [elapsed, autoTimeout, onDismiss]);

  if (!event) return null;

  const config = TYPE_CONFIG[event.type] || TYPE_CONFIG.critical_alert;
  const Icon = config.icon;

  const handleView = () => {
    onDismiss();
    if (event.deepLink) navigate(event.deepLink);
  };

  return (
    <Dialog open={!!event} onOpenChange={() => onDismiss()}>
      <DialogContent
        className="sm:max-w-sm border-none bg-gradient-to-b from-background via-background to-muted/50 backdrop-blur-xl"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="flex flex-col items-center gap-5 py-6">
          {/* Animated icon */}
          <div className="relative">
            <div className={`absolute inset-[-16px] rounded-full ${config.bgClass} animate-ping`} style={{ animationDuration: "2s" }} />
            <div className={`absolute inset-[-8px] rounded-full ${config.bgClass} animate-pulse`} />
            <div className={`relative w-20 h-20 rounded-full ${config.bgClass} border-2 border-current/20 flex items-center justify-center shadow-lg ${config.colorClass}`}>
              <Icon className="h-8 w-8 animate-bounce" style={{ animationDuration: "1.5s" }} />
            </div>
          </div>

          {/* Event info */}
          <div className="space-y-2 text-center max-w-[280px]">
            {event.priority === "critical" && (
              <Badge variant="destructive" className="text-[10px] px-2 py-0.5 mb-1">
                {t("notification.urgent") || "URGENT"}
              </Badge>
            )}
            <p className="text-lg font-bold text-foreground">{event.title}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{event.message}</p>
          </div>

          {/* Timer */}
          <p className="text-[10px] text-muted-foreground/50 font-mono tabular-nums">
            {t("notification.auto_dismiss") || "Auto-dismiss"} {autoTimeout - elapsed}s
          </p>

          {/* Actions */}
          <div className="flex gap-4 w-full px-4">
            <button
              onClick={onDismiss}
              className="flex-1 h-12 rounded-2xl bg-muted text-foreground flex items-center justify-center gap-2 text-sm font-medium active:scale-95 transition-transform"
            >
              <X className="h-4 w-4" />
              {t("common.dismiss") || "Dismiss"}
            </button>
            {event.deepLink && (
              <button
                onClick={handleView}
                className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center gap-2 text-sm font-semibold active:scale-95 transition-transform"
              >
                {t("common.view") || "View"}
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
