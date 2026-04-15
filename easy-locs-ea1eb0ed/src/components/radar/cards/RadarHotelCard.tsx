import { memo } from "react";
import { Star, MapPin, Navigation, MessageCircle, Hotel, Bed } from "lucide-react";
import { haptic } from "@/lib/haptics";
import type { RadarResultItem } from "@/lib/radar/radar-result-item";
import { AppCardTitle } from "@/components/ui/AppText";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { getSubcategoryLabel } from "@/lib/discovery/verticals";

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
  const label = item.subcategory
    ? getSubcategoryLabel(item.category, item.subcategory)
    : item.category;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); } }}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl border transition-all active:scale-[0.98] cursor-pointer ${
        selected ? "bg-info/5 border-info/25" : "bg-card border-border/10"
      }`}
    >
      {rank != null && (
        <div className="w-5 flex items-center justify-center shrink-0">
          <span className={`text-xs font-extrabold tabular-nums ${rank <= 3 ? "text-info" : "text-muted-foreground"}`}>
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
          <span className="absolute -top-1 -right-1 px-1 py-0.5 rounded-full text-2xs font-bold bg-accent text-white">
            Ad
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0 text-left">
        <AppCardTitle lines={1} className="font-bold">{item.title}</AppCardTitle>

        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs text-muted-foreground line-clamp-1">
            {label}
          </span>
          {item.district && (
            <span className="text-2xs text-muted-foreground/60">· {item.district}</span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1">
          {item.ratingValue != null && item.ratingValue > 0 && (
            <span className="flex items-center gap-0.5 text-xs font-semibold text-accent">
              <Star className="w-3 h-3 fill-current" />{item.ratingValue.toFixed(1)}
              {item.reviewsCount > 0 && <span className="text-muted-foreground font-normal">({item.reviewsCount})</span>}
            </span>
          )}
          {item.distanceLabel && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <MapPin className="w-2.5 h-2.5" />{item.distanceLabel}
            </span>
          )}
          {item.priceLabel && (
            <span className="flex items-center gap-0.5 text-xs font-semibold text-info">
              <Bed className="w-2.5 h-2.5" />{item.priceLabel}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {onMessage && (
          <button onClick={e => { e.stopPropagation(); haptic("light"); onMessage(); }} aria-label={`Message ${item.title}`}
            className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-transform bg-primary/10">
            <MessageCircle className="w-3.5 h-3.5 text-primary" />
          </button>
        )}
        {onNavigate && (
          <button onClick={e => { e.stopPropagation(); haptic("light"); onNavigate(); }} aria-label={`Navigate to ${item.title}`}
            className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-transform bg-info/10">
            <Navigation className="w-3.5 h-3.5 text-info" />
          </button>
        )}
      </div>
    </div>
  );
}

export default memo(RadarHotelCard);
