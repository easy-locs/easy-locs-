/**
 * LiveActivityBar — Floating real-time activity strip below hero.
 */
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { Activity, Users, ShoppingBag, MapPin, Zap } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function LiveActivityBar() {
  const { t } = useI18n();
  const [eventIdx, setEventIdx] = useState(0);
  const [activeUsers, setActiveUsers] = useState(2847);

  const LIVE_EVENTS = useMemo(() => [
    { text: t("landing.live.ev1") || "Order placed in Dubai", icon: ShoppingBag, color: "hsl(15 80% 55%)" },
    { text: t("landing.live.ev2") || "New booking in Paris", icon: MapPin, color: "hsl(250 65% 55%)" },
    { text: t("landing.live.ev3") || "Ride started in Dakar", icon: Zap, color: "hsl(270 60% 55%)" },
    { text: t("landing.live.ev4") || "Pro verified in London", icon: Users, color: "hsl(142 60% 45%)" },
    { text: t("landing.live.ev5") || "Property listed in Istanbul", icon: MapPin, color: "hsl(38 65% 50%)" },
    { text: t("landing.live.ev6") || "Food delivered in Riyadh", icon: ShoppingBag, color: "hsl(15 80% 55%)" },
    { text: t("landing.live.ev7") || "Wallet transfer in Abidjan", icon: Zap, color: "hsl(152 60% 42%)" },
    { text: t("landing.live.ev8") || "Stay booked in Bali", icon: MapPin, color: "hsl(200 70% 50%)" },
  ], [t]);

  useEffect(() => {
    const iv = setInterval(() => {
      setEventIdx((i) => (i + 1) % LIVE_EVENTS.length);
      setActiveUsers((v) => v + Math.floor(Math.random() * 5) - 2);
    }, 3500);
    return () => clearInterval(iv);
  }, [LIVE_EVENTS.length]);

  const event = LIVE_EVENTS[eventIdx];

  return (
    <div className="relative overflow-hidden border-y border-border/10 bg-card/50 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4 overflow-hidden">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 overflow-hidden flex-1">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-green-500">LIVE</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={eventIdx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-1.5 min-w-0 overflow-hidden flex-1"
            >
              <event.icon className="h-3.5 w-3.5 shrink-0" style={{ color: event.color }} />
              <span className="text-[10px] sm:text-xs text-muted-foreground truncate">{event.text}</span>
              <span className="text-[8px] sm:text-[9px] text-muted-foreground/50 shrink-0 hidden sm:inline">{t("landing.live.just_now") || "just now"}</span>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="hidden sm:flex items-center gap-5 shrink-0">
          <div className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs font-bold text-foreground tabular-nums">{activeUsers.toLocaleString()}</span>
            <span className="text-[10px] text-muted-foreground">{t("landing.live.online") || "online now"}</span>
          </div>
          <div className="w-px h-4 bg-border/30" />
          <div className="flex items-center gap-1.5">
            <ShoppingBag className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs font-bold text-foreground tabular-nums">1,247</span>
            <span className="text-[10px] text-muted-foreground">{t("landing.live.orders_today") || "orders today"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
