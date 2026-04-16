import { memo } from "react";
import { Star, MapPin, Navigation, MessageCircle, Car, Clock } from "lucide-react";
import { haptic } from "@/lib/haptics";
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

function RadarTaxiCard({ item, rank, selected, onSelect, onNavigate, onMessage }: Props) {
  const handleClick = () => { haptic("light"); onSelect?.(); };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); } }}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl border transition-all active:scale-[0.98] cursor-pointer"
      style={{
        background: selected ? "hsl(168 65% 40% / 0.05)" : "hsl(var(--card))",
        borderColor: selected ? "hsl(168 65% 40% / 0.25)" : "hsl(var(--border) / 0.1)",
      }}
    >
      {rank != null && (
        <div className="w-5 flex items-center justify-center shrink-0">
          <span className="text-[0.6875rem] font-extrabold tabular-nums" style={{ color: rank <= 3 ? "hsl(30 80% 50%)" : "hsl(var(--muted-foreground))" }}>
            {rank}
          </span>
        </div>
      )}

      <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(168 65% 40% / 0.08)" }}>
        <Car className="w-6 h-6" style={{ color: "hsl(30 80% 50%)" }} />
      </div>

      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-1.5">
          <AppCardTitle lines={1} className="font-bold">{item.title}</AppCardTitle>
          {item.isSponsored && (
            <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[0.625rem] font-bold" style={{ background: "hsl(var(--accent) / 0.12)", color: "hsl(var(--accent))" }}>
              Ad
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[0.6875rem] text-muted-foreground capitalize">{item.subcategory || "Ride"}</span>
        </div>

        <div className="flex items-center gap-2 mt-1">
          {item.ratingValue != null && item.ratingValue > 0 && (
            <span className="flex items-center gap-0.5 text-[0.625rem] font-semibold" style={{ color: "hsl(168 72% 44%)" }}>
              <Star className="w-3 h-3 fill-current" />{item.ratingValue.toFixed(1)}
            </span>
          )}
          {item.distanceLabel && (
            <span className="flex items-center gap-0.5 text-[0.625rem] text-muted-foreground">
              <MapPin className="w-2.5 h-2.5" />{item.distanceLabel}
            </span>
          )}
          {item.statusLabel && (
            <span className="flex items-center gap-0.5 text-[0.625rem] font-medium" style={{ color: "hsl(30 80% 50%)" }}>
              <Clock className="w-2.5 h-2.5" />{item.statusLabel}
            </span>
          )}
          {item.priceLabel && (
            <span className="text-[0.625rem] font-extrabold tabular-nums text-foreground">{item.priceLabel}</span>
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
            style={{ background: "hsl(168 65% 40% / 0.1)" }}>
            <Navigation className="w-3.5 h-3.5" style={{ color: "hsl(30 80% 50%)" }} />
          </button>
        )}
      </div>
    </div>
  );
}

export default memo(RadarTaxiCard);
