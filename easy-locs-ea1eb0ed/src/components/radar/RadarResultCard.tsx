import { memo } from "react";
import { Star, MapPin, Navigation, MessageCircle, ChevronRight } from "lucide-react";
import { useI18n, tSafe } from "@/lib/i18n";
import { haptic } from "@/lib/haptics";
import { OptimizedImage } from "@/components/ui/OptimizedImage";

interface RadarEntity {
  id: string;
  name: string;
  title?: string;
  category?: string;
  subcategory?: string;
  lat: number;
  lng: number;
  distance?: number;
  rating?: number;
  imageUrl?: string;
  image_url?: string;
  slug?: string;
  address?: string;
  isSponsored?: boolean;
  reviewsCount?: number;
}

interface Props {
  entity: RadarEntity;
  variant?: "row" | "compact";
  rank?: number;
  selected?: boolean;
  onSelect?: () => void;
  onNavigate?: () => void;
  onMessage?: () => void;
}

function distLabel(km?: number): string | null {
  if (km == null) return null;
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)} km`;
}

function RadarResultCard({ entity, variant = "row", rank, selected, onSelect, onNavigate, onMessage }: Props) {
  const { t } = useI18n();
  const img = entity.imageUrl || entity.image_url;
  const dist = distLabel(entity.distance);
  const cat = entity.subcategory || entity.category || "";
  const name = entity.title || entity.name;

  const handleClick = () => {
    haptic("light");
    onSelect?.();
  };

  if (variant === "compact") {
    return (
      <button
        onClick={handleClick}
        className="flex flex-col rounded-2xl border overflow-hidden shrink-0 transition-all active:scale-[0.97]"
        style={{
          width: 160,
          background: selected ? "hsl(var(--accent) / 0.06)" : "hsl(var(--card))",
          borderColor: selected ? "hsl(var(--accent) / 0.3)" : "hsl(var(--border) / 0.12)",
        }}
      >
        <div className="w-full aspect-[16/10] bg-muted/15 overflow-hidden relative">
          {img ? (
            <OptimizedImage src={img} alt={name} className="w-full h-full" width={200} sizes="160px" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MapPin className="w-5 h-5 text-muted-foreground/30" />
            </div>
          )}
          {entity.isSponsored && (
            <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[0.625rem] font-bold" style={{ background: "hsl(var(--accent) / 0.9)", color: "white" }}>
              Ad
            </span>
          )}
        </div>
        <div className="px-2.5 py-2 min-w-0 overflow-hidden">
          <p className="text-xs font-bold text-foreground line-clamp-1 break-words">{name}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {entity.rating != null && entity.rating > 0 && (
              <span className="flex items-center gap-0.5 text-[0.625rem] font-semibold" style={{ color: "hsl(168 72% 44%)" }}>
                <Star className="w-2.5 h-2.5 fill-current" />{entity.rating.toFixed(1)}
              </span>
            )}
            {dist && <span className="text-[0.625rem] text-muted-foreground">{dist}</span>}
          </div>
        </div>
      </button>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); } }}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl border transition-all active:scale-[0.98] cursor-pointer"
      style={{
        background: selected ? "hsl(var(--accent) / 0.05)" : "hsl(var(--card))",
        borderColor: selected ? "hsl(var(--accent) / 0.25)" : "hsl(var(--border) / 0.1)",
      }}
    >
      {rank != null && (
        <div className="w-5 flex items-center justify-center shrink-0">
          <span className="text-[0.6875rem] font-extrabold tabular-nums" style={{ color: rank <= 3 ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))" }}>
            {rank}
          </span>
        </div>
      )}

      {img ? (
        <OptimizedImage src={img} alt={name} className="w-14 h-14 rounded-xl shrink-0" width={200} sizes="56px" />
      ) : (
        <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 bg-muted/15">
          <MapPin className="w-5 h-5 text-muted-foreground/30" />
        </div>
      )}

      <div className="flex-1 min-w-0 text-left overflow-hidden">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-bold text-foreground line-clamp-2 leading-snug break-words min-w-0">{name}</p>
          {entity.isSponsored && (
            <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[0.625rem] font-bold" style={{ background: "hsl(var(--accent) / 0.12)", color: "hsl(var(--accent))" }}>
              Ad
            </span>
          )}
        </div>
        {cat && (
          <p className="text-[0.6875rem] text-muted-foreground capitalize mt-0.5 line-clamp-1 break-words">{cat.replace(/_/g, " ")}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          {entity.rating != null && entity.rating > 0 && (
            <span className="flex items-center gap-0.5 text-[0.625rem] font-semibold" style={{ color: "hsl(168 72% 44%)" }}>
              <Star className="w-3 h-3 fill-current" />{entity.rating.toFixed(1)}
              {entity.reviewsCount ? <span className="text-muted-foreground font-normal">({entity.reviewsCount})</span> : null}
            </span>
          )}
          {dist && (
            <span className="flex items-center gap-0.5 text-[0.625rem] text-muted-foreground">
              <MapPin className="w-2.5 h-2.5" />{dist}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {onMessage && (
          <button
            onClick={e => { e.stopPropagation(); haptic("light"); onMessage(); }}
            aria-label={`Message ${name}`}
            className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: "hsl(var(--primary) / 0.08)" }}
          >
            <MessageCircle className="w-3.5 h-3.5" style={{ color: "hsl(var(--primary))" }} />
          </button>
        )}
        {onNavigate && (
          <button
            onClick={e => { e.stopPropagation(); haptic("light"); onNavigate(); }}
            aria-label={`Navigate to ${name}`}
            className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: "hsl(var(--accent) / 0.1)" }}
          >
            <Navigation className="w-3.5 h-3.5" style={{ color: "hsl(var(--accent))" }} />
          </button>
        )}
        <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
      </div>
    </div>
  );
}

export default memo(RadarResultCard);
