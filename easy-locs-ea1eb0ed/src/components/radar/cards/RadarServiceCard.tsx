import { memo } from "react";
import { Star, MapPin, Navigation, MessageCircle, Clock, Sparkles } from "lucide-react";
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

function RadarServiceCard({ item, rank, selected, onSelect, onNavigate, onMessage }: Props) {
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
        selected ? "bg-purple-500/5 border-purple-500/25" : "bg-card border-border/10"
      }`}
    >
      {rank != null && (
        <div className="w-5 flex items-center justify-center shrink-0">
          <span className={`text-xs font-extrabold tabular-nums ${rank <= 3 ? "text-purple-500" : "text-muted-foreground"}`}>
            {rank}
          </span>
        </div>
      )}

      {item.image ? (
        <OptimizedImage src={item.image} alt={item.title} className="w-14 h-14 rounded-xl shrink-0" width={200} sizes="56px" />
      ) : (
        <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 bg-muted/15">
          <Sparkles className="w-5 h-5 text-muted-foreground/30" />
        </div>
      )}

      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-1.5">
          <AppCardTitle lines={1} className="font-bold">{item.title}</AppCardTitle>
          {item.isSponsored && (
            <span className="shrink-0 px-1.5 py-0.5 rounded-full text-2xs font-bold bg-accent/10 text-accent">
              Ad
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs text-muted-foreground line-clamp-1">
            {label}
          </span>
          {item.type === "healthcare" && (
            <span className="px-1 py-0.5 rounded text-2xs font-bold bg-destructive/10 text-destructive">
              HC
            </span>
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
          {item.available && (
            <span className="flex items-center gap-0.5 text-xs font-medium text-success">
              <Clock className="w-2.5 h-2.5" />Available
            </span>
          )}
          {item.priceLabel && (
            <span className="text-xs font-semibold text-muted-foreground">{item.priceLabel}</span>
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
            className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-transform bg-purple-500/10">
            <Navigation className="w-3.5 h-3.5 text-purple-500" />
          </button>
        )}
      </div>
    </div>
  );
}

export default memo(RadarServiceCard);
