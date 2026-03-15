/**
 * OrbitOrb — Central animated orb with contextual glow.
 * Uses Three.js on desktop, lightweight CSS on mobile for performance.
 */
import { lazy, Suspense, useMemo } from "react";
import { useOrbitEngine } from "@/stores/orbit-engine";
import { useIsMobile } from "@/hooks/use-mobile";

// Lazy-load Three.js canvas only on desktop
const OrbitOrb3D = lazy(() => import("./OrbitOrb3D"));

interface OrbitOrbProps {
  contextMessage?: string;
  className?: string;
}

function CSSOrb() {
  const { alerts, syncStatus } = useOrbitEngine();

  const color = useMemo(() => {
    if (syncStatus === "error") return "hsl(0 80% 55%)";
    if (alerts.some((a) => a.type === "warning")) return "hsl(38 90% 55%)";
    return "hsl(38 65% 56%)";
  }, [alerts, syncStatus]);

  return (
    <div className="w-48 h-48 relative flex items-center justify-center">
      {/* Glow layers */}
      <div
        className="absolute inset-4 rounded-full blur-2xl opacity-40 animate-pulse"
        style={{ background: color }}
      />
      <div
        className="absolute inset-8 rounded-full blur-xl opacity-60"
        style={{ background: color }}
      />
      {/* Core orb */}
      <div
        className="relative w-28 h-28 rounded-full animate-pulse"
        style={{
          background: `radial-gradient(circle at 35% 35%, hsl(38 70% 72%), ${color}, hsl(220 50% 10%))`,
          boxShadow: `0 0 40px ${color}, 0 0 80px ${color}`,
        }}
      />
    </div>
  );
}

export default function OrbitOrb({ contextMessage, className = "" }: OrbitOrbProps) {
  const { alerts } = useOrbitEngine();
  const isMobile = useIsMobile();
  const displayMessage = contextMessage || alerts[0]?.message || "All systems operational";
  const displayIcon = alerts[0]?.icon || "✨";

  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      <div className="w-48 h-48 sm:w-56 sm:h-56 relative">
        {isMobile ? (
          <CSSOrb />
        ) : (
          <Suspense fallback={<CSSOrb />}>
            <OrbitOrb3D />
          </Suspense>
        )}
      </div>

      <div className="mt-4 text-center animate-fade-in max-w-[280px] mx-auto">
        <span className="text-2xl">{displayIcon}</span>
        <p className="text-sm font-medium mt-1 break-words" style={{ color: "hsl(var(--hud-text))" }}>
          {displayMessage}
        </p>
      </div>
    </div>
  );
}
