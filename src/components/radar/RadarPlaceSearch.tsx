/**
 * RadarPlaceSearch — Premium place search bar embedded in the Radar.
 * Resolves through canonical pipeline → viewport → live overlays → full radar refresh.
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { Search, X, MapPin, Clock, Building2, Plane, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRadarPlaceStore } from "@/stores/radarPlaceStore";
import { searchRadarPlaces, selectRadarPlace } from "@/lib/radar/radar-place-search-adapter";
import type { CanonicalPlaceRow } from "@/lib/address/canonical-address-resolver";
import { motion, AnimatePresence } from "framer-motion";

const PLACE_TYPE_ICON: Record<string, React.ReactNode> = {
  airport: <Plane className="w-3.5 h-3.5" />,
  terminal: <Plane className="w-3.5 h-3.5" />,
  city: <Building2 className="w-3.5 h-3.5" />,
  district: <MapPin className="w-3.5 h-3.5" />,
  mall: <Building2 className="w-3.5 h-3.5" />,
  hotel: <Building2 className="w-3.5 h-3.5" />,
  landmark: <Navigation className="w-3.5 h-3.5" />,
};

export default function RadarPlaceSearch() {
  const { searchQuery, setSearchQuery, searchActive, setSearchActive, setSelectedPlace } = useRadarPlaceStore();
  const [results, setResults] = useState<CanonicalPlaceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setResults([]); return; }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const places = await searchRadarPlaces({ query: q, limit: 8 });
      setResults(places);
      setLoading(false);
    }, 300);
  }, [setSearchQuery]);

  const handleSelect = useCallback(async (place: CanonicalPlaceRow) => {
    setLoading(true);
    const selection = await selectRadarPlace(place);
    setSelectedPlace(selection);
    setSearchActive(false);
    setSearchQuery(selection.label);
    setResults([]);
    setLoading(false);
  }, [setSelectedPlace, setSearchActive, setSearchQuery]);

  const handleClear = useCallback(() => {
    setSearchQuery("");
    setResults([]);
    setSelectedPlace(null);
    inputRef.current?.focus();
  }, [setSearchQuery, setSelectedPlace]);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  return (
    <div className="relative z-30">
      {/* Search input */}
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-xl transition-all",
        "bg-card/90 backdrop-blur-md border",
        searchActive ? "border-primary/30 shadow-lg shadow-primary/5" : "border-border/20"
      )}>
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setSearchActive(true)}
          placeholder="Search places, districts, airports..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
        />
        {searchQuery && (
          <button onClick={handleClear} className="p-0.5 rounded-md hover:bg-muted/50">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      <AnimatePresence>
        {searchActive && (results.length > 0 || loading) && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-1.5 rounded-xl border border-border/20 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden max-h-[300px] overflow-y-auto"
          >
            {loading && results.length === 0 && (
              <div className="px-4 py-3 text-xs text-muted-foreground text-center">Searching...</div>
            )}
            {results.map((place) => (
              <button
                key={place.id}
                onClick={() => handleSelect(place)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 active:bg-muted/50 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-muted/50 text-muted-foreground">
                  {PLACE_TYPE_ICON[place.place_type] ?? <MapPin className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {place.short_label ?? place.formatted_address}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {[place.district, place.city, place.country_code].filter(Boolean).join(" · ")}
                    {place.place_type !== "address" && (
                      <span className="ml-1 capitalize text-primary/70">{place.place_type}</span>
                    )}
                  </p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
