import { memo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { engineHealthMonitor } from "@/engines/core/engine-health-monitor";
import { engineOrchestrator } from "@/engines/core/engine-orchestrator";

interface HealthSnapshot {
  totalEngines: number;
  running: number;
  healthScore: number;
  booted: boolean;
}

const EngineHealthWidget = memo(function EngineHealthWidget() {
  const [health, setHealth] = useState<HealthSnapshot>({
    totalEngines: 0,
    running: 0,
    healthScore: 100,
    booted: false,
  });

  useEffect(() => {
    const update = () => {
      const report = engineHealthMonitor.getReport();
      setHealth({
        totalEngines: report.totalEngines,
        running: report.running,
        healthScore: report.healthScore,
        booted: engineOrchestrator.isBooted,
      });
    };

    update();
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!health.booted && health.totalEngines === 0) return null;

  const isHealthy = health.healthScore >= 80;
  const isWarning = health.healthScore >= 50 && health.healthScore < 80;

  const pulseColor = isHealthy
    ? "hsl(142 65% 45%)"
    : isWarning
    ? "hsl(var(--accent))"
    : "hsl(0 72% 58%)";

  const statusLabel = !health.booted
    ? "Booting…"
    : isHealthy
    ? "Systems Online"
    : isWarning
    ? "Degraded"
    : "Issues Detected";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 px-3 py-2 rounded-xl"
      style={{
        background: "hsl(0 0% 100% / 0.03)",
        border: "1px solid hsl(0 0% 100% / 0.04)",
      }}
    >
      <div className="relative">
        <Activity className="h-3.5 w-3.5" style={{ color: pulseColor }} />
        <motion.div
          className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
          style={{ background: pulseColor }}
          animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <p className="text-[10px] font-bold text-white/50">
        {statusLabel}
      </p>
      {health.booted && health.totalEngines > 0 && (
        <p className="text-[9px] font-medium text-white/25 tabular-nums">
          {health.running}/{health.totalEngines}
        </p>
      )}
    </motion.div>
  );
});

export default EngineHealthWidget;
