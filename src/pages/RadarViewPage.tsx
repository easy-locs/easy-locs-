/**
 * RadarViewPage — Full-screen radar discovery with animated HUD overlay.
 */
import RadarView from "@/components/radar/RadarView";
import EasyLocsRadarOverlay from "@/components/map/EasyLocsRadarOverlay";
import { motion } from "framer-motion";
import { Radio } from "lucide-react";

export default function RadarViewPage() {
  return (
    <div className="h-[calc(100dvh-72px)] flex flex-col bg-background relative">
      {/* HUD header */}
      <motion.div
        className="flex items-center justify-between px-4 py-2 shrink-0 border-b border-border/10"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--accent) / 0.1)" }}>
            <Radio className="w-4 h-4" style={{ color: "hsl(var(--accent))" }} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground">Smart Radar</h1>
            <p className="text-[10px] text-muted-foreground">Real-time discovery</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: "hsl(var(--success) / 0.08)", border: "1px solid hsl(var(--success) / 0.15)" }}>
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "hsl(var(--success))" }} />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "hsl(var(--success))" }} />
          </span>
          <span className="text-[10px] font-bold" style={{ color: "hsl(var(--success))" }}>LIVE</span>
        </div>
      </motion.div>

      <RadarView showMap />
    </div>
  );
}
