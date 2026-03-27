/**
 * MapEntityBottomSheet — Premium glassmorphism detail card. Visual-first, minimal text.
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
    <div className="absolute bottom-5 left-3 right-3 z-20 animate-fade-in">
      <div
        className="rounded-2xl overflow-hidden border border-white/[0.06]"
        style={{
          background: "linear-gradient(135deg, rgba(12,14,20,0.95), rgba(18,22,30,0.92))",
          boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${color}08`,
          backdropFilter: "blur(24px)",
        }}
      >
        <div className="flex items-center gap-3 p-3.5">
          {/* Glowing entity icon */}
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
            <div
              className="absolute inset-0 rounded-xl blur-lg opacity-30"
              style={{ backgroundColor: color }}
            />
            <div
              className="relative h-full w-full rounded-xl flex items-center justify-center overflow-hidden"
              style={{
                backgroundColor: `${color}15`,
                border: `1px solid ${color}25`,
              }}
            >
              {entity.image ? (
                <img src={entity.image} alt="" className="h-full w-full rounded-xl object-cover" />
              ) : (
                <div className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: color }} />
              )}
            </div>
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <h4 className="text-[13px] font-bold text-white/95 line-clamp-1 leading-tight">
              {entity.title}
            </h4>
            {entity.subtitle && (
              <p className="text-[10px] text-white/30 line-clamp-1 mt-0.5">{entity.subtitle}</p>
            )}
            <div className="mt-1.5 flex items-center gap-2.5 flex-wrap">
              {entity.rating != null && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
                  <Star className="h-2.5 w-2.5 fill-amber-400" />
                  {entity.rating.toFixed(1)}
                </span>
              )}
              {entity.distanceKm != null && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-white/35">
                  <Navigation className="h-2.5 w-2.5" />
                  {entity.distanceKm < 1 ? `${Math.round(entity.distanceKm * 1000)}m` : `${entity.distanceKm.toFixed(1)}km`}
                </span>
              )}
              {entity.etaMin != null && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-white/35">
                  <Clock className="h-2.5 w-2.5" />
                  {entity.etaMin}′
                </span>
              )}
              {entity.status && (
                <span
                  className="rounded-full px-1.5 py-px text-[8px] font-bold uppercase tracking-wider"
                  style={{ backgroundColor: `${color}15`, color }}
                >
                  {entity.status}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {onOpen && (
              <button
                onClick={() => onOpen(entity)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 transition-all duration-200"
              >
                <ChevronRight className="h-4 w-4 text-white/60" />
              </button>
            )}
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 transition-all duration-200"
            >
              <X className="h-3.5 w-3.5 text-white/40" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
