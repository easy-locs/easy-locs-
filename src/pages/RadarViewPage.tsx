/**
 * RadarViewPage — Immersive full-screen Hyper Radar with premium HUD.
 * First-class discovery interface — the core of the super app.
 */
import RadarView from "@/components/radar/RadarView";
import { motion } from "framer-motion";
import { Radio, Sparkles, Navigation } from "lucide-react";
import { useLocationStore } from "@/stores/locationStore";
import { useDiscoveryStore } from "@/stores/discoveryStore";

export default function RadarViewPage() {
  const currentLocation = useLocationStore((s) => s.currentLocation);
  const radiusKm = useDiscoveryStore((s) => s.radiusKm);

  return (
    <div className="h-[calc(100dvh-72px)] flex flex-col relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(222 47% 6%) 100%)" }}
    >
      {/* Premium HUD header */}
      <motion.div
        className="flex items-center justify-between px-4 py-2.5 shrink-0 relative z-20"
        style={{
          background: "linear-gradient(180deg, hsl(222 47% 8% / 0.95) 0%, hsl(222 47% 8% / 0.8) 100%)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid hsl(var(--accent) / 0.08)",
        }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="flex items-center gap-3">
          {/* Radar icon with glow */}
          <div className="relative">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, hsl(var(--accent) / 0.15), hsl(var(--accent) / 0.05))",
                border: "1px solid hsl(var(--accent) / 0.2)",
                boxShadow: "0 0 16px hsl(var(--accent) / 0.1)",
              }}
            >
              <Radio className="w-4 h-4" style={{ color: "hsl(var(--accent))" }} />
            </div>
            <motion.div
              className="absolute inset-0 rounded-xl"
              style={{ boxShadow: "0 0 20px hsl(var(--accent) / 0.2)" }}
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-extrabold text-foreground tracking-tight">Hyper Radar</h1>
              <Sparkles className="w-3 h-3" style={{ color: "hsl(var(--accent))" }} />
            </div>
            <p className="text-[10px] text-muted-foreground font-medium">
              {currentLocation ? "Scanning around you" : "Activating radar..."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Radius indicator */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg"
            style={{ background: "hsl(var(--accent) / 0.06)", border: "1px solid hsl(var(--accent) / 0.1)" }}
          >
            <Navigation className="w-3 h-3" style={{ color: "hsl(var(--accent) / 0.7)" }} />
            <span className="text-[10px] font-bold" style={{ color: "hsl(var(--accent))" }}>{radiusKm}km</span>
          </div>

          {/* Live pulse */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{
              background: "hsl(var(--success) / 0.06)",
              border: "1px solid hsl(var(--success) / 0.12)",
            }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "hsl(var(--success))" }} />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "hsl(var(--success))" }} />
            </span>
            <span className="text-[10px] font-bold tracking-wider" style={{ color: "hsl(var(--success))" }}>LIVE</span>
          </div>
        </div>
      </motion.div>

      {/* Main radar content — full bleed */}
      <motion.div
        className="flex-1 min-h-0 relative"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <RadarView showMap />
      </motion.div>
    </div>
  );
}
