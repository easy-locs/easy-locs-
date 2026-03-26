/**
 * LocationSearchInput — Reusable address autocomplete.
 * Uses Search Brain for ranking truth — NO local reranking.
 */
import { useState, useRef, useEffect } from "react";
import { Search, MapPin, Locate, X } from "lucide-react";
import { useSearchBrain } from "@/hooks/useSearchBrain";
import { useLocationStore, type ResolvedPlace } from "@/stores/locationStore";
import { reverseGeocode } from "@/lib/location/geocode";
import { motion, AnimatePresence } from "framer-motion";
import type { SearchBrainResult } from "@/lib/search/search-brain";

interface Props {
  value?: string;
  onSelect: (place: ResolvedPlace) => void;
  placeholder?: string;
  showCurrentLocation?: boolean;
  autoFocus?: boolean;
  className?: string;
  contextType?: string;
}

function toResolvedPlace(r: SearchBrainResult): ResolvedPlace {
  return {
    lat: r.lat,
    lng: r.lng,
    label: r.label,
    city: r.city,
    area: r.district,
    country: r.country_name,
  };
}

export function LocationSearchInput({
  value: controlledValue,
  onSelect,
  placeholder = "Search address…",
  showCurrentLocation = true,
  autoFocus = false,
  className = "",
  contextType,
}: Props) {
  const [query, setQuery] = useState(controlledValue || "");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Search Brain — single source of search ordering truth
  const { results, loading } = useSearchBrain(query);
  const currentLocation = useLocationStore((s) => s.currentLocation);
  const recentPlaces = useLocationStore((s) => s.recentPlaces);
  const savedPlaces = useLocationStore((s) => s.savedPlaces);
  const addRecentPlace = useLocationStore((s) => s.addRecentPlace);

  useEffect(() => {
    if (controlledValue !== undefined) setQuery(controlledValue);
  }, [controlledValue]);

  const handleSelect = (place: ResolvedPlace) => {
    setQuery(place.label);
    setOpen(false);
    addRecentPlace(place);
    onSelect(place);
  };

  const handleCurrentLocation = async () => {
    if (!currentLocation) return;
    try {
      const resolved = await reverseGeocode(currentLocation.lat, currentLocation.lng);
      handleSelect(resolved);
    } catch {
      handleSelect({
        lat: currentLocation.lat,
        lng: currentLocation.lng,
        label: "Current location",
      });
    }
  };

  const showDropdown = open && (query.length >= 2 || showCurrentLocation);
  const allSaved = [...savedPlaces, ...recentPlaces.slice(0, 3)];

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full pl-10 pr-9 py-3 rounded-xl border border-border/30 bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-border/30 bg-card shadow-xl max-h-[300px] overflow-y-auto"
          >
            {showCurrentLocation && currentLocation && (
              <button
                onClick={handleCurrentLocation}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors border-b border-border/10"
              >
                <Locate className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm font-medium text-primary">Use current location</span>
              </button>
            )}

            {query.length < 2 && allSaved.length > 0 && (
              <div>
                <p className="px-4 pt-2 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Saved & Recent</p>
                {allSaved.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelect(p)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
                  >
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.label}</p>
                      {p.city && <p className="text-[11px] text-muted-foreground truncate">{p.city}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {loading && query.length >= 2 && (
              <div className="px-4 py-3 text-xs text-muted-foreground">Searching…</div>
            )}

            {/* Search Brain results — displayed as-is, NO local reranking */}
            {!loading && results.length > 0 && (
              <div>
                {results.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleSelect(toResolvedPlace(r))}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
                  >
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{r.label}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {[r.district, r.city, r.country_name].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!loading && query.length >= 2 && results.length === 0 && (
              <div className="px-4 py-3 text-xs text-muted-foreground">No results found</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
