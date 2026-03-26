/**
 * RadarPlaceSearch — Premium place search bar with live ETA intelligence.
 * Consumes Search Brain output — NO local reranking.
 * After place-discovery selection: runs full pipeline (route + nearby + events).
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { Search, X, MapPin, Clock, Building2, Plane, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRadarPlaceStore } from "@/stores/radarPlaceStore";
import { selectRadarPlace } from "@/lib/radar/radar-place-search-adapter";
import { decorateSearchResults, formatETAChips, type DecoratedSearchResult } from "@/lib/radar/search-result-decorator";
import type { CanonicalPlaceRow } from "@/lib/address/canonical-address-resolver";
import { searchBrain, type SearchBrainResult } from "@/lib/search/search-brain";
import { runPlaceSelectionPipeline, type PlaceSelectionResult } from "@/lib/map/place-selection-pipeline";
import { MapPlaceCard } from "@/components/map/MapPlaceCard";
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

/** Convert SearchBrainResult → minimal CanonicalPlaceRow for selectRadarPlace */
function toPlaceRow(r: SearchBrainResult): CanonicalPlaceRow {
  return {
    id: r.canonical_place_id ?? r.id,
    provider: r.provider,
    provider_place_id: null,
    place_type: r.place_type,
    country_code: r.country_code ?? "AE",
    country_name: r.country_name ?? null,
    city: r.city ?? null,
    district: r.district ?? null,
    subdistrict: null,
    postal_code: null,
    street: null,
    building: null,
    landmark: null,
    formatted_address: r.formatted_address,
    short_label: r.label,
    lat: r.lat,
    lng: r.lng,
    timezone: null,
    geohash: null,
    zone_key: r.zone_key ?? null,
    parent_place_id: null,
    popularity_score: 0,
    confidence_score: r.final_score,
    metadata_json: null,
    created_at: "",
    updated_at: "",
  };
}

export default function RadarPlaceSearch() {
  const { searchQuery, setSearchQuery, searchActive, setSearchActive, setSelectedPlace } = useRadarPlaceStore();
  const [brainResults, setBrainResults] = useState<SearchBrainResult[]>([]);
  const [decorated, setDecorated] = useState<DecoratedSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [enrichment, setEnrichment] = useState<PlaceSelectionResult | null>(null);
  const [enrichmentLoading, setEnrichmentLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<{ name: string; district?: string; city?: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    setEnrichment(null);
    setSelectedLabel(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setBrainResults([]); setDecorated([]); return; }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const ranked = await searchBrain({ query: q, contextType: "global" });
      setBrainResults(ranked);
      const placeRows = ranked.map(toPlaceRow);
      const enriched = await decorateSearchResults(placeRows);
      setDecorated(enriched);
      setLoading(false);
    }, 300);
  }, [setSearchQuery]);

  const handleSelect = useCallback(async (result: SearchBrainResult) => {
    setLoading(true);
    const placeRow = toPlaceRow(result);
    const selection = await selectRadarPlace(placeRow);
    setSelectedPlace(selection);
    setSearchActive(false);
    setSearchQuery(selection.label);
    setBrainResults([]);
    setDecorated([]);
    setLoading(false);

    // Run enrichment pipeline (route + nearby)
    setSelectedLabel({ name: result.label, district: result.district, city: result.city });
    setEnrichmentLoading(true);
    try {
      const pipelineResult = await runPlaceSelectionPipeline({
        id: result.canonical_place_id ?? result.id,
        lat: result.lat,
        lng: result.lng,
        zone_key: result.zone_key,
        label: result.label,
      });
      setEnrichment(pipelineResult);
    } catch {
      setEnrichment(null);
    } finally {
      setEnrichmentLoading(false);
    }
  }, [setSelectedPlace, setSearchActive, setSearchQuery]);

  const handleClear = useCallback(() => {
    setSearchQuery("");
    setBrainResults([]);
    setDecorated([]);
    setSelectedPlace(null);
    setEnrichment(null);
    setSelectedLabel(null);
    inputRef.current?.focus();
  }, [setSearchQuery, setSelectedPlace]);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const results = brainResults.map((r, i) => ({
    result: r,
    decoration: decorated[i] ?? null,
  }));

  return (
    <div className="relative z-30 space-y-2">
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

      <AnimatePresence>
        {searchActive && (results.length > 0 || loading) && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-1.5 rounded-xl border border-border/20 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden max-h-[340px] overflow-y-auto z-40"
          >
            {loading && results.length === 0 && (
              <div className="px-4 py-3 text-xs text-muted-foreground text-center">Searching...</div>
            )}
            {results.map(({ result, decoration }) => {
              const etaChips = decoration ? formatETAChips(decoration.eta_projection) : [];
              return (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  className="w-full flex flex-col gap-1 px-3 py-2.5 hover:bg-muted/30 active:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-muted/50 text-muted-foreground">
                      {PLACE_TYPE_ICON[result.place_type] ?? <MapPin className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{result.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {[result.district, result.city, result.country_code].filter(Boolean).join(" · ")}
                        {result.place_type !== "address" && (
                          <span className="ml-1 capitalize text-primary/70">{result.place_type}</span>
                        )}
                        {result.local_rank_bucket === "international" && (
                          <span className="ml-1">🌍</span>
                        )}
                      </p>
                    </div>
                  </div>
                  {etaChips.length > 0 && (
                    <div className="flex gap-1.5 ml-11">
                      {etaChips.map(chip => (
                        <span
                          key={chip.category}
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-muted/60 text-muted-foreground"
                        >
                          <span>{chip.emoji}</span>
                          <span>{chip.minutes}min</span>
                        </span>
                      ))}
                      {decoration?.live_context.traffic && (
                        <span className={cn(
                          "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-semibold",
                          decoration.live_context.traffic === "heavy" || decoration.live_context.traffic === "severe"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted/60 text-muted-foreground"
                        )}>
                          🚗 {decoration.live_context.traffic}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enriched place card — shown after selection */}
      <AnimatePresence>
        {(enrichment || enrichmentLoading) && selectedLabel && (
          <MapPlaceCard
            placeName={selectedLabel.name}
            district={selectedLabel.district}
            city={selectedLabel.city}
            route={enrichment?.route ?? null}
            nearby={enrichment?.nearby ?? null}
            loading={enrichmentLoading}
            onGoThere={() => {/* future: open navigation */}}
            onOrderHere={() => {/* future: navigate to nearby merchants */}}
            onExploreNearby={() => {/* future: expand nearby view */}}
            onDismiss={() => { setEnrichment(null); setSelectedLabel(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
