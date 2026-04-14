import { memo } from "react";
import { Star, MapPin, Navigation, MessageCircle, Hotel, Bed } from "lucide-react";
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

function RadarHotelCard({ item, rank, selected, onSelect, onNavigate, onMessage }: Props) {
  const handleClick = () => { haptic("light"); onSelect?.(); };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); } }}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl border transition-all active:scale-[0.98] cursor-pointer"
      style={{
        background: selected ? "hsl(200 70% 50% / 0.05)" : "hsl(var(--card))",
        borderColor: selected ? "hsl(200 70% 50% / 0.25)" : "hsl(var(--border) / 0.1)",
      }}
    >
      {rank != null && (
        <div className="w-5 flex items-center justify-center shrink-0">
          <span className="text-[11px] font-extrabold tabular-nums" style={{ color: rank <= 3 ? "hsl(200 70% 50%)" : "hsl(var(--muted-foreground))" }}>
            {rank}
          </span>
        </div>
      )}

      <div className="relative shrink-0">
        {item.image ? (
          <OptimizedImage src={item.image} alt={item.title} className="w-14 h-14 rounded-xl" width={200} sizes="56px" />
        ) : (
          <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-muted/15">
            <Hotel className="w-5 h-5 text-muted-foreground/30" />
          </div>
        )}
        {item.isSponsored && (
          <span className="absolute -top-1 -right-1 px-1 py-0.5 rounded-full text-[8px] font-bold" style={{ background: "hsl(var(--accent))", color: "white" }}>
            Ad
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0 text-left">
        <AppCardTitle lines={1} className="font-bold">{item.title}</AppCardTitle>

        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[11px] text-muted-foreground capitalize line-clamp-1">
            {item.subcategory || item.category}
          </span>
          {item.district && (
            <span className="text-[10px] text-muted-foreground/60">· {item.district}</span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1">
          {item.ratingValue != null && item.ratingValue > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] font-semibold" style={{ color: "hsl(168 72% 44%)" }}>
              <Star className="w-3 h-3 fill-current" />{item.ratingValue.toFixed(1)}
              {item.reviewsCount > 0 && <span className="text-muted-foreground font-normal">({item.reviewsCount})</span>}
            </span>
          )}
          {item.distanceLabel && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <MapPin className="w-2.5 h-2.5" />{item.distanceLabel}
            </span>
          )}
          {item.priceLabel && (
            <span className="flex items-center gap-0.5 text-[10px] font-semibold" style={{ color: "hsl(200 70% 50%)" }}>
              <Bed className="w-2.5 h-2.5" />{item.priceLabel}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {onMessage && (
          <button onClick={e => { e.stopPropagation(); haptic("light"); onMessage(); }} aria-label={`Message ${item.title}`}
            className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: "hsl(var(--primary) / 0.08)" }}>
            <MessageCircle className="w-3.5 h-3.5" style={{ color: "hsl(var(--primary))" }} />
          </button>
        )}
        {onNavigate && (
          <button onClick={e => { e.stopPropagation(); haptic("light"); onNavigate(); }} aria-label={`Navigate to ${item.title}`}
            className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: "hsl(200 70% 50% / 0.1)" }}>
            <Navigation className="w-3.5 h-3.5" style={{ color: "hsl(200 70% 50%)" }} />
          </button>
        )}
      </div>
    </div>
  );
}

export default memo(RadarHotelCard);
