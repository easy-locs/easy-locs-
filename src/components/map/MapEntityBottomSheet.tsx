/**
 * MapEntityBottomSheet — Detail sheet when an entity is selected on the canonical map.
 */
import type { MapEntity } from "@/types/map";
import { kindToEmoji, kindToColor } from "@/lib/map/map-style-helpers";
import { X, Navigation, Star, Clock } from "lucide-react";

interface Props {
  entity: MapEntity | null;
  onClose: () => void;
  onOpen?: (entity: MapEntity) => void;
}

export function MapEntityBottomSheet({ entity, onClose, onOpen }: Props) {
  if (!entity) return null;

  return (
    <div className="absolute bottom-4 left-3 right-3 z-20 animate-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-2xl border border-border/20 bg-card/95 backdrop-blur-md shadow-2xl overflow-hidden">
        <div className="flex items-start gap-3 p-3">
          {/* Icon */}
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl"
            style={{ backgroundColor: `${kindToColor(entity.kind)}20` }}
          >
            {kindToEmoji(entity.kind)}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-foreground line-clamp-1">{entity.title}</h4>
            {entity.subtitle && (
              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{entity.subtitle}</p>
            )}
            <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
              {entity.distanceKm != null && (
                <span className="flex items-center gap-0.5">
                  <Navigation className="h-3 w-3" />
                  {entity.distanceKm < 1 ? `${Math.round(entity.distanceKm * 1000)}m` : `${entity.distanceKm.toFixed(1)}km`}
                </span>
              )}
              {entity.etaMin != null && (
                <span className="flex items-center gap-0.5">
                  <Clock className="h-3 w-3" />
                  {entity.etaMin} min
                </span>
              )}
              {entity.rating != null && (
                <span className="flex items-center gap-0.5">
                  <Star className="h-3 w-3 text-yellow-500" />
                  {entity.rating.toFixed(1)}
                </span>
              )}
              {entity.status && (
                <span className="rounded-full bg-muted/30 px-1.5 py-0.5 capitalize">{entity.status}</span>
              )}
            </div>
          </div>

          {/* Close */}
          <button onClick={onClose} className="shrink-0 rounded-full p-1 hover:bg-muted/30 transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {onOpen && (
          <div className="border-t border-border/10 px-3 py-2">
            <button
              onClick={() => onOpen(entity)}
              className="w-full rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              View Details
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
