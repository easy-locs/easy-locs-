import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Search, X, Clock, MapPin, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n, tSafe } from "@/lib/i18n";
import { useUnifiedSearchStore } from "@/lib/search-engine/search-store";
import type { SearchResult, AutocompleteGroup } from "@/lib/search-engine/search-types";
import { useRadarPlaceStore } from "@/stores/radarPlaceStore";
import { selectRadarPlace } from "@/lib/radar/radar-place-search-adapter";
import type { CanonicalPlaceRow } from "@/lib/address/canonical-address-resolver";
import type { RadarLayer } from "@/lib/engines/hyper-radar-engine";
import { RADAR_QUICK_CATEGORIES } from "@/lib/taxonomy/world-class-taxonomy";

const HISTORY_KEY = "radar_search_history";
const MAX_HISTORY = 8;

interface HistoryItem {
  query: string;
  label: string;
  lat: number;
  lng: number;
  timestamp: number;
}

function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(items: HistoryItem[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX_HISTORY)));
  } catch {}
}

function addToHistory(item: HistoryItem) {
  const existing = loadHistory().filter(h => h.query !== item.query);
  saveHistory([item, ...existing]);
}

interface Props {
  onCategorySelect?: (layer: RadarLayer) => void;
  onSearchFilter?: (query: string) => void;
  showSearchHere?: boolean;
  onSearchHere?: () => void;
  className?: string;
}

export default function RadarSmartSearch({ onCategorySelect, onSearchFilter, showSearchHere, onSearchHere, className }: Props) {
  const { t } = useI18n();
  const { setSelectedPlace, setSearchQuery: setStoreQuery, setSearchActive: setStoreActive } = useRadarPlaceStore();

  const v2SetQuery = useUnifiedSearchStore(s => s.setQuery);
  const v2Autocomplete = useUnifiedSearchStore(s => s.autocomplete);
  const v2AutocompleteLoading = useUnifiedSearchStore(s => s.autocompleteLoading);
  const v2ClearQuery = useUnifiedSearchStore(s => s.clearQuery);
  const v2SetLocation = useUnifiedSearchStore(s => s.setLocation);

  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>(() => loadHistory());
  const inputRef = useRef<HTMLInputElement>(null);

  const flatResults = useMemo<SearchResult[]>(() => {
    if (!query.trim() || v2Autocomplete.length === 0) return [];
    return v2Autocomplete.flatMap(g => g.items).slice(0, 6);
  }, [v2Autocomplete, query]);

  const handleChange = useCallback((value: string) => {
    setQuery(value);
    onSearchFilter?.(value);
    v2SetQuery(value);
  }, [onSearchFilter, v2SetQuery]);

  const handleSelect = useCallback(async (result: SearchResult) => {
    const lat = result.lat;
    const lng = result.lng;

    if (lat != null && lng != null) {
      try {
        const placeRow: CanonicalPlaceRow = {
          id: result.id,
          provider: "unified_search",
          provider_place_id: null,
          place_type: result.type === "location" ? "district" : result.type === "category" ? "city" : "shop",
          country_code: "AE",
          country_name: null,
          city: result.city ?? null,
          district: result.district ?? null,
          subdistrict: null,
          postal_code: null,
          street: null,
          building: null,
          landmark: null,
          formatted_address: result.subtitle || result.title,
          short_label: result.title,
          lat,
          lng,
          timezone: null,
          geohash: null,
          zone_key: null,
          parent_place_id: null,
          popularity_score: 0,
          confidence_score: result.score ?? 0,
          metadata_json: null,
          created_at: "",
          updated_at: "",
        };
        const selection = await selectRadarPlace(placeRow);
        setSelectedPlace(selection);
        setStoreQuery(selection.label);
      } catch {
        setSelectedPlace({
          canonical_place_id: result.id,
          label: result.title,
          formatted_address: result.subtitle || result.title,
          lat,
          lng,
          zone_key: "",
          place_type: result.type,
          viewport: null,
          overlay: null,
        });
        setStoreQuery(result.title);
      }
      v2SetLocation(lat, lng);

      const item: HistoryItem = {
        query: result.title,
        label: result.title,
        lat,
        lng,
        timestamp: Date.now(),
      };
      addToHistory(item);
      setHistory(loadHistory());
    }

    setQuery(result.title);
    setFocused(false);
    v2SetQuery(result.title);
  }, [setSelectedPlace, setStoreQuery, v2SetLocation, v2SetQuery]);

  const handleHistorySelect = useCallback((item: HistoryItem) => {
    setQuery(item.query);
    onSearchFilter?.(item.query);
    v2SetQuery(item.query);
    setFocused(false);

    if (item.lat && item.lng) {
      setSelectedPlace({
        canonical_place_id: "",
        label: item.label,
        formatted_address: item.label,
        lat: item.lat,
        lng: item.lng,
        zone_key: "",
        place_type: "location",
        viewport: null,
        overlay: null,
      });
      setStoreQuery(item.label);
      v2SetLocation(item.lat, item.lng);
    }
  }, [onSearchFilter, setSelectedPlace, setStoreQuery, v2SetLocation, v2SetQuery]);

  const handleClear = useCallback(() => {
    setQuery("");
    v2ClearQuery();
    setSelectedPlace(null);
    setStoreQuery("");
    onSearchFilter?.("");
    inputRef.current?.focus();
  }, [setSelectedPlace, setStoreQuery, onSearchFilter, v2ClearQuery]);

  const clearHistory = useCallback(() => {
    localStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  }, []);

  const loading = v2AutocompleteLoading;
  const showDropdown = focused && (flatResults.length > 0 || loading || (query.length < 2 && history.length > 0));

  return (
    <div className={`relative ${className || ""}`}>
      <div
        className="flex items-center gap-2 px-3 h-11 rounded-2xl border transition-all backdrop-blur-md"
        style={{
          background: "hsl(var(--card) / 0.95)",
          borderColor: focused ? "hsl(var(--accent) / 0.4)" : "hsl(var(--border) / 0.15)",
          boxShadow: focused ? "0 0 0 3px hsl(var(--accent) / 0.08)" : "none",
        }}
      >
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => { setFocused(true); setStoreActive(true); }}
          onBlur={() => setTimeout(() => { setFocused(false); setStoreActive(false); }, 200)}
          placeholder={tSafe(t, "radar.search_places", "Search places, restaurants, shops...")}
          className="flex-1 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground/60 outline-none min-w-0"
        />
        <AnimatePresence>
          {showSearchHere && !focused && (
            <motion.button
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => { e.stopPropagation(); onSearchHere?.(); }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.625rem] font-bold whitespace-nowrap shrink-0 active:scale-95 transition-transform"
              style={{
                background: "hsl(var(--accent) / 0.12)",
                color: "hsl(var(--accent))",
                border: "1px solid hsl(var(--accent) / 0.25)",
              }}
            >
              <Search className="w-3 h-3" />
              {tSafe(t, "radar.search_here", "Search here")}
            </motion.button>
          )}
        </AnimatePresence>
        {query && (
          <button onClick={handleClear} aria-label="Clear search" className="p-1 rounded-lg active:scale-90 transition-transform">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {!focused && !query && onCategorySelect && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none mt-2 pb-0.5">
          {RADAR_QUICK_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => onCategorySelect(cat.id as RadarLayer)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[0.625rem] font-semibold whitespace-nowrap border shrink-0 active:scale-95 transition-all"
              style={{
                background: "hsl(var(--card) / 0.85)",
                borderColor: "hsl(var(--border) / 0.15)",
                color: "hsl(var(--muted-foreground))",
                backdropFilter: "blur(8px)",
              }}
            >
              <span>{cat.emoji}</span>
              {t(cat.labelKey)}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-1.5 rounded-2xl border overflow-hidden max-h-[320px] overflow-y-auto"
            style={{
              background: "hsl(var(--card) / 0.97)",
              borderColor: "hsl(var(--border) / 0.2)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 12px 40px hsl(var(--background) / 0.5)",
              zIndex: 50,
            }}
          >
            {loading && flatResults.length === 0 && (
              <div className="flex items-center gap-2 px-4 py-3">
                <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
                <span className="text-xs text-muted-foreground">{tSafe(t, "radar.searching", "Searching...")}</span>
              </div>
            )}

            {v2Autocomplete.map((group: AutocompleteGroup) => (
              group.items.length > 0 && (
                <div key={group.type}>
                  <div className="px-4 pt-2.5 pb-1">
                    <span className="text-[0.625rem] font-bold text-muted-foreground uppercase tracking-wider">
                      {group.label}
                    </span>
                  </div>
                  {group.items.slice(0, 3).map(r => (
                    <button
                      key={r.id}
                      onClick={() => handleSelect(r)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/20 active:bg-muted/30"
                    >
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: "hsl(var(--accent) / 0.1)" }}
                      >
                        {r.imageUrl ? (
                          <img loading="lazy" src={r.imageUrl} alt="" className="w-8 h-8 rounded-xl object-cover" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5" style={{ color: "hsl(var(--accent))" }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground line-clamp-1">{r.title}</p>
                        <p className="text-[0.625rem] text-muted-foreground line-clamp-1">
                          {[r.district, r.city, r.vertical].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      {r.score != null && r.score > 0.7 && (
                        <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "hsl(var(--accent) / 0.1)" }}>
                          <Sparkles className="w-2.5 h-2.5" style={{ color: "hsl(var(--accent))" }} />
                          <span className="text-[0.625rem] font-bold" style={{ color: "hsl(var(--accent))" }}>{tSafe(t, "radar.best_match", "Best")}</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )
            ))}

            {query.length < 2 && history.length > 0 && (
              <>
                <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: "hsl(var(--border) / 0.1)" }}>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[0.625rem] font-bold text-muted-foreground uppercase tracking-wider">{tSafe(t, "radar.recent", "Recent")}</span>
                  </div>
                  <button onClick={clearHistory} className="text-[0.625rem] font-semibold text-muted-foreground/60 active:opacity-70">
                    {tSafe(t, "radar.clear", "Clear")}
                  </button>
                </div>
                {history.map(h => (
                  <button
                    key={h.timestamp}
                    onClick={() => handleHistorySelect(h)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/20 active:bg-muted/30"
                  >
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-muted/20">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground/50" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground line-clamp-1">{h.label}</p>
                    </div>
                  </button>
                ))}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
