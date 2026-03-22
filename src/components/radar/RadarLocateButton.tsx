import { useLongPress } from "@/hooks/useLongPress";
import { useRadarStore } from "@/stores/radarStore";

export function RadarLocateButton({ onLocate }: { onLocate: () => void }) {
  const openMenu = useRadarStore((s) => s.openMenu);

  const bind = useLongPress(
    () => openMenu(),
    () => onLocate(),
    450
  );

  return (
    <button
      {...bind}
      className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-card/80 text-foreground shadow-lg active:scale-[0.97] backdrop-blur-md"
      aria-label="Locate me"
    >
      📡
    </button>
  );
}
