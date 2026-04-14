import { useState, useCallback, useRef, useEffect } from "react";
import { Search, X, Clock, MapPin, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n, tSafe } from "@/lib/i18n";
import { searchBrain, type SearchBrainResult } from "@/lib/search/search-brain";
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

interface Props {
  onCategorySelect?: (layer: RadarLayer) => void;
  onSearchFilter?: (query: string) => void;
  className?: string;
}

export default function RadarSmartSearch({ onCategorySelect, onSearchFilter, className }: Props) {
  const { t } = useI18n();
  const { setSelectedPlace, setSearchQuery: setStoreQuery, setSearchActive: setStoreActive } = useRadarPlaceStore();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<SearchBrainResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>(() => loadHistory());
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleChange = useCallback((value: string) => {
    setQuery(value);
    onSearchFilter?.(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const ranked = await searchBrain({ query: value, contextType: "global" });
        setResults(ranked.slice(0, 6));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [onSearchFilter]);

  const handleSelect = useCallback(async (result: SearchBrainResult) => {
    try {
      const placeRow = toPlaceRow(result);
      const selection = await selectRadarPlace(placeRow);
      setSelectedPlace(selection);
      setStoreQuery(selection.label);
      setQuery(result.label);
      setFocused(false);
      setResults([]);

      const item: HistoryItem = {
        query: result.label,
        label: result.label,
        lat: result.lat,
        lng: result.lng,
        timestamp: Date.now(),
      };
      addToHistory(item);
      setHistory(loadHistory());
    } catch {}
  }, [setSelectedPlace, setStoreQuery]);

  const handleHistorySelect = useCallback((item: HistoryItem) => {
    setQuery(item.query);
    onSearchFilter?.(item.query);
    setFocused(false);
  }, [onSearchFilter]);

  const handleClear = useCallback(() => {
    setQuery("");
    setResults([]);
    setSelectedPlace(null);
    setStoreQuery("");
    onSearchFilter?.("");
    inputRef.current?.focus();
  }, [setSelectedPlace, setStoreQuery, onSearchFilter]);

  const clearHistory = useCallback(() => {
    localStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  }, []);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const showDropdown = focused && (results.length > 0 || loading || (query.length < 2 && history.length > 0));

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
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-semibold whitespace-nowrap border shrink-0 active:scale-95 transition-all"
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
            {loading && results.length === 0 && (
              <div className="flex items-center gap-2 px-4 py-3">
                <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
                <span className="text-xs text-muted-foreground">{tSafe(t, "radar.searching", "Searching...")}</span>
              </div>
            )}

            {results.map(r => (
              <button
                key={r.id}
                onClick={() => handleSelect(r)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/20 active:bg-muted/30"
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "hsl(var(--accent) / 0.1)" }}
                >
                  <MapPin className="w-3.5 h-3.5" style={{ color: "hsl(var(--accent))" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground line-clamp-1">{r.label}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">
                    {[r.district, r.city, r.country_code].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {r.final_score > 0.7 && (
                  <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "hsl(var(--accent) / 0.1)" }}>
                    <Sparkles className="w-2.5 h-2.5" style={{ color: "hsl(var(--accent))" }} />
                    <span className="text-[10px] font-bold" style={{ color: "hsl(var(--accent))" }}>{tSafe(t, "radar.best_match", "Best")}</span>
                  </div>
                )}
              </button>
            ))}

            {query.length < 2 && history.length > 0 && (
              <>
                <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: "hsl(var(--border) / 0.1)" }}>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{tSafe(t, "radar.recent", "Recent")}</span>
                  </div>
                  <button onClick={clearHistory} className="text-[10px] font-semibold text-muted-foreground/60 active:opacity-70">
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
