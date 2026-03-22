import { useLongPress } from "@/hooks/useLongPress";
import { useRadarStore } from "@/stores/radarStore";
import { ultraHaptic } from "@/lib/performance/useUltraFast";

export function RadarLocateButton({ onLocate }: { onLocate: () => void }) {
  const openMenu = useRadarStore((s) => s.openMenu);

  const bind = useLongPress(
    () => { ultraHaptic("success"); openMenu(); },
    () => { ultraHaptic("light"); onLocate(); },
    450
  );

  return (
    <button
      {...bind}
      className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-card/80 text-foreground shadow-lg active:scale-[0.93] transition-transform duration-75 backdrop-blur-md will-change-transform"
      aria-label="Locate me"
    >
      📡
    </button>
  );
}
