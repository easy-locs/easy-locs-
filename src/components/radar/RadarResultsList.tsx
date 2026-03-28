import { useRadarStore } from "@/stores/radarStore";
import { ultraHaptic } from "@/lib/performance/useUltraFast";
import { Star, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

export function RadarResultsList() {
  const filtered = useRadarStore((s) => s.filtered);

  if (!filtered.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <span className="text-3xl">📡</span>
        <p className="text-sm font-medium text-foreground">No results nearby</p>
        <p className="text-xs text-muted-foreground">
          Try a different search or enable location.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {filtered.map((item) => (
        <Link
          key={item.id}
          to={item.slug ? `/s/${item.slug}` : `/s/${item.id}`}
          onClick={() => ultraHaptic("light")}
          className="flex gap-3 rounded-2xl border border-border/15 bg-card overflow-hidden active:scale-[0.97] transition-transform duration-75 will-change-transform"
        >
          {/* Image */}
          <div className="w-[100px] h-[88px] shrink-0 bg-muted/20 overflow-hidden">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.title}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <MapPin className="h-5 w-5 text-muted-foreground/30" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 py-2.5 pr-3 flex flex-col justify-center">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-bold text-foreground break-words leading-snug line-clamp-2">{item.title}</p>
              {item.isSponsored && (
                <span className="shrink-0 text-[8px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">AD</span>
              )}
            </div>
            {item.subtitle && (
              <p className="text-[11px] text-muted-foreground break-words leading-snug line-clamp-2 mt-0.5">{item.subtitle}</p>
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {item.district && (
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <MapPin className="h-2.5 w-2.5" />
                  {item.district}
                </span>
              )}
              {item.rating != null && item.rating > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-500">
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                  {item.rating.toFixed(1)}
                  {item.reviewsCount ? (
                    <span className="text-muted-foreground font-normal">({item.reviewsCount})</span>
                  ) : null}
                </span>
              )}
              {item.distanceKm != null && (
                <span className="text-[10px] text-muted-foreground">
                  {item.distanceKm < 1
                    ? `${Math.round(item.distanceKm * 1000)}m`
                    : `${item.distanceKm.toFixed(1)} km`}
                </span>
              )}
              <span className="text-[9px] text-muted-foreground/60 capitalize">{item.category}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
