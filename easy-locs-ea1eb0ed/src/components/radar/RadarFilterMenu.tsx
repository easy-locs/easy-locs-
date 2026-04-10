import { useRadarStore } from "@/stores/radarStore";
import type { RadarCategory } from "@/lib/radar/types";
import { RadarSweep } from "@/components/radar/RadarSweep";
import { ultraHaptic } from "@/lib/performance/useUltraFast";
import { eventBus } from "@/lib/core/event-bus";
import { RADAR_CATEGORIES, getSubcategoriesForRadarCategory, type RadarMainCategory } from "@/lib/taxonomy/world-class-taxonomy";

export function RadarFilterMenu() {
  const menuOpen = useRadarStore((s) => s.menuOpen);
  const closeMenu = useRadarStore((s) => s.closeMenu);
  const setCategory = useRadarStore((s) => s.setCategory);
  const setSubCategory = useRadarStore((s) => s.setSubCategory);
  const category = useRadarStore((s) => s.category);

  if (!menuOpen) return null;

  const subs = getSubcategoriesForRadarCategory(category as RadarMainCategory);

  const pickCategory = (cat: RadarCategory) => {
    ultraHaptic("light");
    setCategory(cat);
    setSubCategory(null);
    eventBus.emit("RADAR_FILTER_CHANGED", { category: cat });
    if (cat === "all") closeMenu();
  };

  const pickSub = (subValue: string) => {
    ultraHaptic("light");
    setSubCategory(subValue);
    eventBus.emit("RADAR_FILTER_CHANGED", { category, subcategory: subValue });
    closeMenu();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-xl" onClick={closeMenu} />

      <div className="relative flex flex-col items-center gap-5 z-10 max-w-[90vw]">
        <div className="relative w-[260px] h-[260px] rounded-full border border-primary/20">
          <RadarSweep />

          <button
            onClick={() => { pickCategory("all"); closeMenu(); }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary-foreground active:scale-[0.90] transition-transform duration-75"
          >
            ALL
          </button>

          {RADAR_CATEGORIES.filter(c => c.value !== "all").map(({ value, emoji }, i) => {
            const angle = (i * 72 - 90) * (Math.PI / 180);
            const r = 95;
            const x = 130 + r * Math.cos(angle) - 24;
            const y = 130 + r * Math.sin(angle) - 24;
            return (
              <button
                key={value}
                onClick={() => pickCategory(value as RadarCategory)}
                style={{ position: "absolute", left: x, top: y }}
                className={`z-10 flex h-12 w-12 items-center justify-center rounded-full text-xl active:scale-[0.90] transition-transform duration-75 ${
                  category === value
                    ? "bg-primary/30 shadow-[0_0_16px_hsl(var(--primary)/0.4)] ring-2 ring-primary/40"
                    : "bg-muted/70"
                }`}
              >
                {emoji}
              </button>
            );
          })}
        </div>

        {subs.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 max-w-[300px]">
            {subs.slice(0, 8).map((sub) => (
              <button
                key={sub.value}
                onClick={() => pickSub(sub.value)}
                className="flex items-center gap-1 rounded-full border border-border/20 bg-muted/60 px-3 py-1.5 text-[11px] text-foreground active:scale-[0.95] transition-transform duration-75"
              >
                <span>{sub.emoji}</span> {sub.label}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={closeMenu}
          className="rounded-full border border-border/20 bg-muted/40 px-6 py-2 text-xs text-muted-foreground active:scale-[0.95] transition-transform duration-75"
        >
          Close
        </button>
      </div>
    </div>
  );
}
