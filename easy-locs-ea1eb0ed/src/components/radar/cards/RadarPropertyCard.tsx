import { memo } from "react";
import { Star, MapPin, Navigation, MessageCircle, Building2, BedDouble } from "lucide-react";
import { haptic } from "@/lib/haptics";
import type { RadarResultItem } from "@/lib/radar/radar-result-item";
import { AppCardTitle } from "@/components/ui/AppText";
import { OptimizedImage } from "@/components/ui/OptimizedImage";

interface Props {
  item: RadarResultItem;
  rank?: number;
  selected?: boolean;
  onSelect?: () => void;
  onNavigate?: () => void;
  onMessage?: () => void;
  onSave?: () => void;
}

function RadarPropertyCard({ item, rank, selected, onSelect, onNavigate, onMessage }: Props) {
  const handleClick = () => { haptic("light"); onSelect?.(); };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); } }}
      className="w-full rounded-2xl border overflow-hidden transition-all active:scale-[0.98] cursor-pointer"
      style={{
        background: selected ? "hsl(225 20% 35% / 0.05)" : "hsl(var(--card))",
        borderColor: selected ? "hsl(225 20% 35% / 0.25)" : "hsl(var(--border) / 0.1)",
      }}
    >
      <div className="w-full aspect-[16/10] bg-muted/15 overflow-hidden relative">
        {item.image ? (
          <OptimizedImage src={item.image} alt={item.title} className="w-full h-full" width={800} sizes="(max-width: 640px) 100vw, 400px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="w-8 h-8 text-muted-foreground/20" />
          </div>
        )}
        {item.isSponsored && (
          <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "hsl(var(--accent) / 0.9)", color: "white" }}>
            Ad
          </span>
        )}
        {rank != null && rank <= 5 && (
          <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-lg text-[10px] font-extrabold tabular-nums" style={{ background: "hsl(225 22% 16% / 0.85)", color: "hsl(var(--accent))" }}>
            #{rank}
          </span>
        )}
        {item.priceLabel && (
          <span className="absolute bottom-2 right-2 px-2 py-1 rounded-lg text-xs font-extrabold tabular-nums" style={{ background: "hsl(var(--card) / 0.9)", color: "hsl(var(--foreground))", backdropFilter: "blur(8px)" }}>
            {item.priceLabel}
          </span>
        )}
      </div>

      <div className="px-3 py-2.5">
        <AppCardTitle lines={1} className="font-bold">{item.title}</AppCardTitle>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[11px] text-muted-foreground capitalize line-clamp-1">
            {item.subcategory || item.category}
          </span>
          {item.district && (
            <span className="text-[10px] text-muted-foreground/60">· {item.district}</span>
          )}
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            {item.ratingValue != null && item.ratingValue > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] font-semibold" style={{ color: "hsl(168 72% 44%)" }}>
                <Star className="w-3 h-3 fill-current" />{item.ratingValue.toFixed(1)}
              </span>
            )}
            {item.distanceLabel && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <MapPin className="w-2.5 h-2.5" />{item.distanceLabel}
              </span>
            )}
            {item.meta.bedrooms && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <BedDouble className="w-2.5 h-2.5" />{item.meta.bedrooms as number} bd
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {onMessage && (
              <button onClick={e => { e.stopPropagation(); haptic("light"); onMessage(); }} aria-label={`Message ${item.title}`}
                className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-transform"
                style={{ background: "hsl(var(--primary) / 0.08)" }}>
                <MessageCircle className="w-3 h-3" style={{ color: "hsl(var(--primary))" }} />
              </button>
            )}
            {onNavigate && (
              <button onClick={e => { e.stopPropagation(); haptic("light"); onNavigate(); }} aria-label={`Navigate to ${item.title}`}
                className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-transform"
                style={{ background: "hsl(225 20% 35% / 0.1)" }}>
                <Navigation className="w-3 h-3" style={{ color: "hsl(225 20% 35%)" }} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(RadarPropertyCard);
