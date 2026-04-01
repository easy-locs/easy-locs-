/**
 * SmartBottomSheet — Premium Uber-style draggable results sheet.
 * 3 snap points: collapsed (104px), half (45vh), expanded (82vh).
 * Glass dark design with spring-like transitions.
 */
import { memo } from "react";
import { ChevronRight, Navigation, Phone, MapPin, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useUnifiedMapStore, type SheetSnapPoint } from "@/stores/mapStore";
import type { MapSearchResult } from "@/lib/map/smart-map-search";

function ResultItem({ result, selected, onSelect }: {
  result: MapSearchResult;
  selected: boolean;
  onSelect: () => void;
}) {
  const distLabel = result.distanceM != null
    ? result.distanceM < 1000
      ? `${Math.round(result.distanceM)}m`
      : `${(result.distanceM / 1000).toFixed(1)}km`
    : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all active:scale-[0.98]",
        selected ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"
      )}
    >
      {/* Icon/Logo — 48x48 */}
      <div
        className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl overflow-hidden"
        style={{ backgroundColor: (result.primaryColor || "#666") + "15", border: `1px solid ${result.primaryColor || "#666"}25` }}
      >
        {result.logoUrl ? (
          <img src={result.logoUrl} alt="" className="h-8 w-8 object-contain" />
        ) : (
          <span className="text-xl">{result.iconEmoji || "📍"}</span>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold text-white/95 line-clamp-1">{result.displayName}</div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-white/40">
          <span className="capitalize">{(result.category || "").replace(/_/g, " ")}</span>
          {distLabel && (
            <>
              <span className="text-white/15">·</span>
              <span className="inline-flex items-center gap-0.5">
                <Navigation className="h-2.5 w-2.5" />
                {distLabel}
              </span>
            </>
          )}
          {result.isOpenNow != null && (
            <>
              <span className="text-white/15">·</span>
              <span className={result.isOpenNow ? "text-emerald-400" : "text-red-400"}>
                {result.isOpenNow ? "Ouvert" : "Fermé"}
              </span>
            </>
          )}
        </div>
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-white/20" />
    </button>
  );
}

function SheetContent() {
  const results = useUnifiedMapStore(s => s.search.results);
  const intent = useUnifiedMapStore(s => s.search.intent);
  const selectedId = useUnifiedMapStore(s => s.selectedEntityId);
  const selectEntity = useUnifiedMapStore(s => s.selectEntity);
  const sheetSnap = useUnifiedMapStore(s => s.sheetSnap);

  const selected = results.find(r => r.id === selectedId);

  const intentLabel = intent?.type === "brand"
    ? intent.brand.canonicalName
    : intent?.type === "service"
      ? intent.token.iconLabel
      : "Résultats";

  // Detail view when entity selected
  if (selected && (sheetSnap === "half" || sheetSnap === "expanded")) {
    const distLabel = selected.distanceM != null
      ? selected.distanceM < 1000
        ? `${Math.round(selected.distanceM)}m`
        : `${(selected.distanceM / 1000).toFixed(1)}km`
      : null;

    const phone = selected.tags?.phone || selected.tags?.["contact:phone"];

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl overflow-hidden"
            style={{ backgroundColor: (selected.primaryColor || "#666") + "15", border: `1px solid ${selected.primaryColor || "#666"}25` }}
          >
            {selected.logoUrl ? (
              <img src={selected.logoUrl} alt="" className="h-10 w-10 object-contain" />
            ) : (
              <span className="text-2xl">{selected.iconEmoji || "📍"}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[16px] font-bold text-white/95 line-clamp-1">{selected.displayName}</h3>
            <div className="mt-0.5 flex items-center gap-2 text-[12px] text-white/40">
              <span className="capitalize">{(selected.category || "").replace(/_/g, " ")}</span>
              {distLabel && (
                <>
                  <span className="text-white/15">·</span>
                  <span>{distLabel}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {(selected.tags?.["addr:street"] || selected.tags?.["addr:city"]) && (
          <div className="flex items-start gap-2 rounded-xl bg-white/[0.03] px-3 py-2.5">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/30" />
            <span className="text-[12px] text-white/50">
              {[selected.tags?.["addr:housenumber"], selected.tags?.["addr:street"], selected.tags?.["addr:postcode"], selected.tags?.["addr:city"]].filter(Boolean).join(", ")}
            </span>
          </div>
        )}

        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-[13px] font-semibold text-primary-foreground active:scale-[0.97] transition-transform">
            <Navigation className="h-4 w-4" />
            Itinéraire
          </button>
          {phone && (
            <a href={`tel:${phone}`} className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.06] active:scale-[0.97] transition-transform">
              <Phone className="h-4 w-4 text-white/60" />
            </a>
          )}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[14px] font-semibold text-white/80">{intentLabel}</h3>
        <span className="text-[11px] text-white/30">{results.length} résultats</span>
      </div>
      <div className="space-y-0.5 max-h-[50vh] overflow-y-auto scrollbar-none">
        {results.map(r => (
          <ResultItem
            key={r.id}
            result={r}
            selected={r.id === selectedId}
            onSelect={() => selectEntity(r.id)}
          />
        ))}
      </div>
    </div>
  );
}

const SNAP_HEIGHTS: Record<SheetSnapPoint, string> = {
  closed: "0px",
  collapsed: "104px",
  half: "45vh",
  expanded: "82vh",
};

export default memo(function SmartBottomSheet() {
  const sheetSnap = useUnifiedMapStore(s => s.sheetSnap);
  const setSheetSnap = useUnifiedMapStore(s => s.setSheetSnap);
  const clearSearch = useUnifiedMapStore(s => s.clearSearch);

  if (sheetSnap === "closed") return null;

  return (
    <AnimatePresence>
      <motion.div
        className="absolute bottom-0 left-0 right-0 z-40"
        initial={{ y: "100%" }}
        animate={{ y: 0, height: SNAP_HEIGHTS[sheetSnap] }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
      >
        <div
          className="h-full rounded-t-[28px] border-t border-white/[0.06] overflow-hidden"
          style={{
            background: "rgba(8,12,24,0.96)",
            boxShadow: "0 -20px 60px rgba(0,0,0,0.5)",
            backdropFilter: "blur(24px)",
          }}
        >
          {/* Grip + close */}
          <div className="relative flex items-center justify-center px-4 pt-3 pb-2">
            <button
              type="button"
              onClick={() => {
                if (sheetSnap === "collapsed") setSheetSnap("half");
                else if (sheetSnap === "half") setSheetSnap("expanded");
                else setSheetSnap("half");
              }}
              className="p-2"
              aria-label="Expand sheet"
            >
              <div className="h-1 w-9 rounded-full bg-white/20" />
            </button>
            <button
              type="button"
              onClick={() => clearSearch()}
              className="absolute right-4 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] active:scale-95 transition-transform"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5 text-white/40" />
            </button>
          </div>

          {/* Content */}
          <div className="px-4 pb-4 overflow-y-auto scrollbar-none" style={{ maxHeight: "calc(100% - 44px)" }}>
            <SheetContent />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});
