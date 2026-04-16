import { memo } from "react";
import { Link } from "react-router-dom";
import { Compass, Star, MapPin, ChevronRight, Navigation } from "lucide-react";
import { motion } from "framer-motion";
import { useI18n, tSafe } from "@/lib/i18n";
import { haptic } from "@/lib/haptics";
import type { RadarResultItem } from "@/lib/radar/radar-result-item";

interface Props {
  onExploreMore: () => void;
  items: RadarResultItem[];
  loading: boolean;
  totalCount: number;
}

const VERTICAL_EMOJI: Record<string, string> = {
  food: "🍽️",
  hotel: "🏨",
  property: "🏠",
  services: "🔧",
  shops: "🛍️",
  taxi: "🚗",
  healthcare: "🏥",
  nightlife: "🌙",
  grocery: "🛒",
};

function RadarPreviewWidget({ onExploreMore, items: allItems, loading, totalCount }: Props) {
  const { t } = useI18n();
  const items = allItems.slice(0, 5);

  if (loading && items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 home-card rounded-2xl overflow-hidden"
        style={{ marginBottom: "var(--section-gap)" }}
      >
        <div className="px-4 pt-3 pb-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--accent) / 0.1)" }}>
              <Compass className="w-3.5 h-3.5" style={{ color: "hsl(var(--accent))" }} />
            </div>
            <div className="h-3 w-24 rounded bg-muted animate-pulse" />
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 py-2.5">
              <div className="w-12 h-12 rounded-xl bg-muted animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
                <div className="h-2.5 w-1/2 rounded bg-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  if (items.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 home-card rounded-2xl overflow-hidden"
      style={{ marginBottom: "var(--section-gap)" }}
    >
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--accent) / 0.1)" }}>
            <Compass className="w-3.5 h-3.5" style={{ color: "hsl(var(--accent))" }} />
          </div>
          <h3 className="text-[0.6875rem] font-extrabold uppercase tracking-widest text-muted-foreground/60">
            {tSafe(t, "dashboard.nearby_radar", "Nearby")}
          </h3>
          {totalCount > 5 && (
            <span
              className="text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-full tabular-nums"
              style={{ background: "hsl(var(--accent) / 0.1)", color: "hsl(var(--accent))" }}
            >
              {totalCount}+
            </span>
          )}
        </div>
        <button
          onClick={() => { haptic("light"); onExploreMore(); }}
          className="flex items-center gap-0.5 text-[0.625rem] font-bold active:opacity-70"
          style={{ color: "hsl(var(--accent))" }}
        >
          {tSafe(t, "dashboard.explore_more", "Explore")} <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {items.map((item, idx) => (
        <Link
          key={item.id}
          to={item.route}
          className="flex items-center gap-3 px-4 py-2.5 active:bg-muted/20 transition-colors"
          style={idx < items.length - 1 ? { borderBottom: "1px solid hsl(var(--border) / 0.05)" } : undefined}
        >
          {item.image ? (
            <img
              src={item.image}
              alt={item.title}
              className="w-12 h-12 rounded-xl object-cover shrink-0"
              loading="lazy"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-lg"
              style={{ background: "hsl(var(--muted) / 0.3)" }}
            >
              {VERTICAL_EMOJI[item.type] || "📍"}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground line-clamp-1 leading-snug">{item.title}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[0.625rem] text-muted-foreground capitalize line-clamp-1">
                {VERTICAL_EMOJI[item.type]} {item.category?.replace(/_/g, " ") || item.type}
              </span>
              {item.ratingValue != null && item.ratingValue > 0 && (
                <span className="flex items-center gap-0.5 text-[0.625rem] font-bold" style={{ color: "hsl(var(--accent))" }}>
                  <Star className="w-2.5 h-2.5" style={{ fill: "hsl(var(--accent))", color: "hsl(var(--accent))" }} />
                  {item.ratingValue.toFixed(1)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {item.distanceLabel && (
              <span className="flex items-center gap-0.5 text-[0.625rem] text-muted-foreground font-medium tabular-nums">
                <MapPin className="w-2.5 h-2.5" /> {item.distanceLabel}
              </span>
            )}
            <Navigation className="w-3.5 h-3.5 text-muted-foreground/40" />
          </div>
        </Link>
      ))}

      <button
        onClick={() => { haptic("light"); onExploreMore(); }}
        className="w-full flex items-center justify-center gap-2 py-3 active:bg-muted/20 transition-colors"
        style={{ borderTop: "1px solid hsl(var(--border) / 0.06)" }}
      >
        <Compass className="w-3.5 h-3.5" style={{ color: "hsl(var(--accent))" }} />
        <span className="text-[0.6875rem] font-bold" style={{ color: "hsl(var(--accent))" }}>
          {tSafe(t, "dashboard.explore_nearby", "Explore what's nearby")}
        </span>
      </button>
    </motion.div>
  );
}

export default memo(RadarPreviewWidget);
