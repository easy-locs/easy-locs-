import { useRadarStore } from "@/stores/radarStore";
import type { RadarCategory, RadarSubCategory } from "@/lib/radar/types";
import { RadarSweep } from "@/components/radar/RadarSweep";
import { ultraHaptic } from "@/lib/performance/useUltraFast";
import { eventBus } from "@/lib/events/eventBus";

const CATEGORIES: { cat: RadarCategory; icon: string; pos: string }[] = [
  { cat: "food", icon: "🍕", pos: "absolute top-2 left-1/2 -translate-x-1/2" },
  { cat: "shops", icon: "🛍️", pos: "absolute right-2 top-1/2 -translate-y-1/2" },
  { cat: "property", icon: "🏠", pos: "absolute bottom-2 left-1/2 -translate-x-1/2" },
  { cat: "services", icon: "🧰", pos: "absolute left-2 top-1/2 -translate-y-1/2" },
  { cat: "grocery", icon: "🥬", pos: "absolute top-[18%] right-[14%]" },
];

const SUB_MAP: Record<RadarCategory, RadarSubCategory[]> = {
  all: [],
  food: ["pizza", "burger", "sushi"],
  shops: ["market", "pharmacy"],
  grocery: ["market"],
  property: ["apartment"],
  services: ["repair", "cleaning"],
};

export function RadarFilterMenu() {
  const menuOpen = useRadarStore((s) => s.menuOpen);
  const closeMenu = useRadarStore((s) => s.closeMenu);
  const setCategory = useRadarStore((s) => s.setCategory);
  const setSubCategory = useRadarStore((s) => s.setSubCategory);
  const category = useRadarStore((s) => s.category);

  if (!menuOpen) return null;

  const subs = SUB_MAP[category] ?? [];

  const pickCategory = (cat: RadarCategory) => {
    ultraHaptic("light");
    setCategory(cat);
    eventBus.emit("RADAR_FILTER_CHANGED", { category: cat });
    closeMenu();
  };

  const pickSub = (sub: RadarSubCategory) => {
    ultraHaptic("light");
    setSubCategory(sub);
    eventBus.emit("RADAR_FILTER_CHANGED", { category, subcategory: sub });
    closeMenu();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-xl"
        onClick={closeMenu}
      />

      <div className="relative flex flex-col items-center gap-5 z-10">
        <div className="relative w-[260px] h-[260px] rounded-full border border-emerald-400/20">
          <RadarSweep />

          {CATEGORIES.map(({ cat, icon, pos }) => (
            <button
              key={cat}
              onClick={() => pickCategory(cat)}
              className={`${pos} z-10 flex h-12 w-12 items-center justify-center rounded-full text-xl active:scale-[0.90] transition-transform duration-75 ${
                category === cat
                  ? "bg-emerald-500/30 shadow-[0_0_16px_hsl(var(--primary)/0.4)]"
                  : "bg-slate-900/70"
              }`}
            >
              {icon}
            </button>
          ))}

          <button
            onClick={() => { ultraHaptic("light"); setCategory("all"); setSubCategory(null); closeMenu(); }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary-foreground active:scale-[0.90] transition-transform duration-75"
          >
            ALL
          </button>
        </div>

        {subs.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {subs.map((sub) => (
              <button
                key={sub}
                onClick={() => pickSub(sub)}
                className="rounded-full border border-white/10 bg-muted/60 px-3 py-1 text-[11px] capitalize text-foreground active:scale-[0.95] transition-transform duration-75"
              >
                {sub}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={closeMenu}
          className="rounded-full border border-white/10 bg-muted/40 px-6 py-2 text-xs text-muted-foreground active:scale-[0.95] transition-transform duration-75"
        >
          Close
        </button>
      </div>
    </div>
  );
}
