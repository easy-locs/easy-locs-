/**
 * MapEntityBottomSheet — Premium, compact detail sheet. Visual-first, minimal text.
 */
import type { MapEntity } from "@/types/map";
import { kindToColor } from "@/lib/map/map-style-helpers";
import { X, Navigation, Star, Clock, ChevronRight } from "lucide-react";

interface Props {
  entity: MapEntity | null;
  onClose: () => void;
  onOpen?: (entity: MapEntity) => void;
}

export function MapEntityBottomSheet({ entity, onClose, onOpen }: Props) {
  if (!entity) return null;

  const color = kindToColor(entity.kind);

  return (
    <div className="absolute bottom-4 left-3 right-3 z-20 animate-fade-in">
      <div
        className="rounded-2xl overflow-hidden shadow-2xl border border-white/[0.06]"
        style={{ background: "linear-gradient(135deg, rgba(15,17,22,0.96), rgba(20,24,32,0.94))" }}
      >
        <div className="flex items-center gap-3 p-3">
          {/* Glowing icon dot */}
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
            <div
              className="absolute inset-0 rounded-xl blur-md opacity-40"
              style={{ backgroundColor: color }}
            />
            <div
              className="relative h-full w-full rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${color}20`, borderColor: `${color}30`, borderWidth: 1 }}
            >
              {entity.image ? (
                <img src={entity.image} alt="" className="h-8 w-8 rounded-lg object-cover" />
              ) : (
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
              )}
            </div>
          </div>

          {/* Info — compact */}
          <div className="min-w-0 flex-1">
            <h4 className="text-[13px] font-bold text-white/95 line-clamp-1 leading-tight">
              {entity.title}
            </h4>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              {entity.rating != null && (
                <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-400">
                  <Star className="h-2.5 w-2.5 fill-amber-400" />
                  {entity.rating.toFixed(1)}
                </span>
              )}
              {entity.distanceKm != null && (
                <span className="flex items-center gap-0.5 text-[10px] text-white/40">
                  <Navigation className="h-2.5 w-2.5" />
                  {entity.distanceKm < 1 ? `${Math.round(entity.distanceKm * 1000)}m` : `${entity.distanceKm.toFixed(1)}km`}
                </span>
              )}
              {entity.etaMin != null && (
                <span className="flex items-center gap-0.5 text-[10px] text-white/40">
                  <Clock className="h-2.5 w-2.5" />
                  {entity.etaMin}′
                </span>
              )}
              {entity.status && (
                <span
                  className="rounded-full px-1.5 py-px text-[9px] font-bold uppercase tracking-wider"
                  style={{ backgroundColor: `${color}20`, color }}
                >
                  {entity.status}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {onOpen && (
              <button
                onClick={() => onOpen(entity)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/8 hover:bg-white/15 transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-white/70" />
              </button>
            )}
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/8 hover:bg-white/15 transition-colors"
            >
              <X className="h-3.5 w-3.5 text-white/50" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
