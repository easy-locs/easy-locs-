/**
 * LiveActivityBar — Floating real-time activity strip below hero.
 * Shows live counters, pulsing indicators, and dynamic stats.
 */
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Activity, Users, ShoppingBag, MapPin, Zap } from "lucide-react";

const LIVE_EVENTS = [
  { text: "Order placed in Dubai", icon: ShoppingBag, color: "hsl(15 80% 55%)" },
  { text: "New booking in Paris", icon: MapPin, color: "hsl(250 65% 55%)" },
  { text: "Ride started in Dakar", icon: Zap, color: "hsl(270 60% 55%)" },
  { text: "Pro verified in London", icon: Users, color: "hsl(142 60% 45%)" },
  { text: "Property listed in Istanbul", icon: MapPin, color: "hsl(38 65% 50%)" },
  { text: "Food delivered in Riyadh", icon: ShoppingBag, color: "hsl(15 80% 55%)" },
  { text: "Wallet transfer in Abidjan", icon: Zap, color: "hsl(152 60% 42%)" },
  { text: "Stay booked in Bali", icon: MapPin, color: "hsl(200 70% 50%)" },
];

export default function LiveActivityBar() {
  const [eventIdx, setEventIdx] = useState(0);
  const [activeUsers, setActiveUsers] = useState(2847);

  useEffect(() => {
    const iv = setInterval(() => {
      setEventIdx((i) => (i + 1) % LIVE_EVENTS.length);
      setActiveUsers((v) => v + Math.floor(Math.random() * 5) - 2);
    }, 3500);
    return () => clearInterval(iv);
  }, []);

  const event = LIVE_EVENTS[eventIdx];

  return (
    <div className="relative overflow-hidden border-y border-border/10 bg-card/50 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">
        {/* Left — live pulse + event */}
        <div className="flex items-center gap-3 min-w-0">
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
              className="flex items-center gap-1.5 min-w-0"
            >
              <event.icon className="h-3.5 w-3.5 shrink-0" style={{ color: event.color }} />
              <span className="text-xs text-muted-foreground truncate">{event.text}</span>
              <span className="text-[9px] text-muted-foreground/50 shrink-0">just now</span>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right — live counters */}
        <div className="hidden sm:flex items-center gap-5 shrink-0">
          <div className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs font-bold text-foreground tabular-nums">{activeUsers.toLocaleString()}</span>
            <span className="text-[10px] text-muted-foreground">online now</span>
          </div>
          <div className="w-px h-4 bg-border/30" />
          <div className="flex items-center gap-1.5">
            <ShoppingBag className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs font-bold text-foreground tabular-nums">1,247</span>
            <span className="text-[10px] text-muted-foreground">orders today</span>
          </div>
        </div>
      </div>
    </div>
  );
}
