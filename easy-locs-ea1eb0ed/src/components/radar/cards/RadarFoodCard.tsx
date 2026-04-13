import { memo } from "react";
import { Star, MapPin, Navigation, MessageCircle, Clock, ShoppingBag } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { useI18n } from "@/lib/i18n";
import type { RadarResultItem } from "@/lib/radar/radar-result-item";
import { AppCardTitle } from "@/components/ui/AppText";

interface Props {
  item: RadarResultItem;
  rank?: number;
  selected?: boolean;
  onSelect?: () => void;
  onNavigate?: () => void;
  onMessage?: () => void;
  onSave?: () => void;
}

function RadarFoodCard({ item, rank, selected, onSelect, onNavigate, onMessage }: Props) {
  const { t } = useI18n();
  const handleClick = () => { haptic("light"); onSelect?.(); };
  const cuisineLabel = item.subcategory ? item.subcategory.replace(/_/g, " ") : item.category;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); } }}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl border transition-all active:scale-[0.98] cursor-pointer"
      style={{
        background: selected ? "hsl(38 65% 56% / 0.05)" : "hsl(var(--card))",
        borderColor: selected ? "hsl(38 65% 56% / 0.25)" : "hsl(var(--border) / 0.12)",
        boxShadow: selected ? "0 0 0 1px hsl(38 65% 56% / 0.1)" : "none",
      }}
    >
      {rank != null && (
        <div className="w-5 flex items-center justify-center shrink-0">
          <span className="text-xs font-extrabold tabular-nums" style={{ color: rank <= 3 ? "hsl(38 65% 56%)" : "hsl(var(--muted-foreground))" }}>
            {rank}
          </span>
        </div>
      )}

      {item.image ? (
        <img src={item.image} alt={item.title} className="w-14 h-14 rounded-xl object-cover shrink-0" loading="lazy" />
      ) : (
        <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(var(--muted) / 0.15)" }}>
          <ShoppingBag className="w-5 h-5" style={{ color: "hsl(var(--muted-foreground) / 0.3)" }} />
        </div>
      )}

      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-1.5">
          <AppCardTitle lines={1} className="font-bold" style={{ color: "hsl(var(--foreground))" }}>{item.title}</AppCardTitle>
          {item.isSponsored && (
            <span className="shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-bold" style={{ background: "hsl(38 65% 56% / 0.12)", color: "hsl(38 65% 56%)" }}>
              Ad
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 mt-0.5">
          {cuisineLabel && <span className="text-xs capitalize line-clamp-1" style={{ color: "hsl(var(--muted-foreground))" }}>{cuisineLabel}</span>}
          {item.priceLabel && <span className="text-xs font-semibold" style={{ color: "hsl(var(--muted-foreground))" }}>{item.priceLabel}</span>}
        </div>

        <div className="flex items-center gap-2 mt-1">
          {item.ratingValue != null && item.ratingValue > 0 && (
            <span className="flex items-center gap-0.5 text-xs font-semibold" style={{ color: "hsl(38 65% 56%)" }}>
              <Star className="w-3 h-3 fill-current" />{item.ratingValue.toFixed(1)}
              {item.reviewsCount > 0 && <span style={{ color: "hsl(var(--muted-foreground))" }} className="font-normal">({item.reviewsCount})</span>}
            </span>
          )}
          {item.distanceLabel && (
            <span className="flex items-center gap-0.5 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
              <MapPin className="w-2.5 h-2.5" />{item.distanceLabel}
            </span>
          )}
          {item.available && (
            <span className="flex items-center gap-0.5 text-xs font-medium" style={{ color: "hsl(var(--success))" }}>
              <Clock className="w-2.5 h-2.5" />{t("radar.open") || "Open"}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {onMessage && (
          <button
            onClick={e => { e.stopPropagation(); haptic("light"); onMessage(); }}
            aria-label={`${t("radar.message") || "Message"} ${item.title}`}
            className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: "hsl(var(--primary) / 0.08)" }}
          >
            <MessageCircle className="w-3.5 h-3.5" style={{ color: "hsl(var(--primary))" }} />
          </button>
        )}
        {onNavigate && (
          <button
            onClick={e => { e.stopPropagation(); haptic("light"); onNavigate(); }}
            aria-label={`${t("radar.navigate") || "Navigate"} ${item.title}`}
            className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: "hsl(38 65% 56% / 0.1)" }}
          >
            <Navigation className="w-3.5 h-3.5" style={{ color: "hsl(38 65% 56%)" }} />
          </button>
        )}
      </div>
    </div>
  );
}

export default memo(RadarFoodCard);
