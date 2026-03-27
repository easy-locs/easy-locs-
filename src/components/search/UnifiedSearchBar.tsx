/**
 * UnifiedSearchBar — Canonical search bar for the entire platform.
 * Variants: hero (home/landing), compact (sticky header), fullscreen (mobile overlay).
 * Connects to unified search store — same engine everywhere.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, MapPin, Clock, TrendingUp, ChevronRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useUnifiedSearchStore } from "@/lib/search-engine/search-store";
import { saveToHistory } from "@/lib/search-engine/search-suggestions";
import { useLocationStore } from "@/stores/locationStore";
import { useV2AuthStore } from "@/stores/v2AuthStore";
import type { AutocompleteGroup, SearchResult, SearchSuggestion } from "@/lib/search-engine/search-types";

type Variant = "hero" | "compact" | "fullscreen";

interface UnifiedSearchBarProps {
  variant?: Variant;
  className?: string;
  placeholder?: string;
  onResultSelect?: (result: SearchResult) => void;
  showSuggestions?: boolean;
  autoFocus?: boolean;
}

export default function UnifiedSearchBar({
  variant = "compact",
  className,
  placeholder,
  onResultSelect,
  showSuggestions = true,
  autoFocus = false,
}: UnifiedSearchBarProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  const query = useUnifiedSearchStore((s) => s.state.query);
  const setQuery = useUnifiedSearchStore((s) => s.setQuery);
  const clearQuery = useUnifiedSearchStore((s) => s.clearQuery);
  const autocomplete = useUnifiedSearchStore((s) => s.autocomplete);
  const suggestions = useUnifiedSearchStore((s) => s.suggestions);
  const loadSuggestions = useUnifiedSearchStore((s) => s.loadSuggestions);
  const search = useUnifiedSearchStore((s) => s.search);
  const setFilters = useUnifiedSearchStore((s) => s.setFilters);

  const user = useV2AuthStore((s) => s.user);
  const location = useLocationStore((s) => s.currentLocation);

  const defaultPlaceholder = placeholder || "Find pizza, burgers, shops, services...";

  // Load suggestions on focus
  useEffect(() => {
    if (focused && showSuggestions && suggestions.length === 0) {
      loadSuggestions(user?.id, location?.lat, location?.lng);
    }
  }, [focused, showSuggestions]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!query.trim()) return;
    saveToHistory(query, user?.id);
    search();
    setFocused(false);
    navigate(`/search-results?q=${encodeURIComponent(query)}`);
  }, [query, user?.id, search, navigate]);

  const handleResultClick = useCallback((result: SearchResult) => {
    setFocused(false);
    if (onResultSelect) {
      onResultSelect(result);
      return;
    }

    switch (result.type) {
      case "shop":
        navigate(result.slug ? `/s/${result.slug}` : `/s/${result.id}`);
        break;
      case "category":
        if (result.subcategory) {
          setFilters({ vertical: result.vertical as any, subcategory: result.subcategory });
        } else if (result.vertical) {
          setFilters({ vertical: result.vertical as any });
        }
        search();
        navigate("/radar");
        break;
      case "location":
        setFilters({ district: result.district, city: result.city });
        search();
        navigate("/radar");
        break;
      case "product":
        if (result.shopId) navigate(`/s/${result.shopId}`);
        break;
    }
  }, [navigate, onResultSelect, setFilters, search]);

  const handleSuggestionClick = useCallback((suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    saveToHistory(suggestion.text, user?.id);
    search();
    setFocused(false);
    navigate(`/search-results?q=${encodeURIComponent(suggestion.text)}`);
  }, [setQuery, user?.id, search, navigate]);

  const showDropdown = focused && (autocomplete.length > 0 || (suggestions.length > 0 && !query.trim()));
  const isHero = variant === "hero";
  const isFullscreen = variant === "fullscreen";

  // Fullscreen mobile variant
  if (isFullscreen) {
    return (
      <>
        <button
          onClick={() => setFullscreenOpen(true)}
          className={cn(
            "flex h-12 w-full min-w-0 items-center gap-3 rounded-2xl border border-border/20 bg-card px-4 text-sm text-muted-foreground shadow-sm active:scale-[0.98] transition-transform",
            className
          )}
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 text-left text-sm font-medium leading-snug break-words line-clamp-2">{defaultPlaceholder}</span>
        </button>

        <AnimatePresence>
          {fullscreenOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[100] flex flex-col bg-background"
            >
              {/* Header */}
              <div className="flex min-w-0 items-center gap-3 border-b border-border/20 px-4 py-3">
                <button
                  onClick={() => setFullscreenOpen(false)}
                  className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="relative min-w-0 flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    ref={inputRef}
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    placeholder={defaultPlaceholder}
                    className="h-12 w-full min-w-0 rounded-2xl border border-border/30 bg-card pl-10 pr-9 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {query && (
                    <button
                      onClick={clearQuery}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-muted flex items-center justify-center"
                    >
                      <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>

              {/* Location context */}
              {location && (
                <div className="px-4 py-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>Near you</span>
                </div>
              )}

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
                {/* Suggestions when no query */}
                {!query.trim() && suggestions.length > 0 && (
                  <SuggestionsList suggestions={suggestions} onClick={handleSuggestionClick} />
                )}

                {/* Autocomplete results */}
                {query.trim() && autocomplete.map((group) => (
                  <AutocompleteSection key={group.type} group={group} onClick={handleResultClick} />
                ))}

                {/* Empty state */}
                {query.trim() && autocomplete.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-sm text-muted-foreground">No results 😕</p>
                    <p className="text-xs text-muted-foreground mt-1">Try "Pizza" or "Burgers"</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div ref={containerRef} className={cn("relative w-full min-w-0", className)}>
      {/* Input */}
      <div className={cn(
        "relative flex min-w-0 items-center overflow-visible",
        isHero && "shadow-lg"
      )}>
        <Search className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground",
          isHero ? "h-5 w-5" : "h-4 w-4"
        )} />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder={defaultPlaceholder}
          autoFocus={autoFocus}
          className={cn(
            "w-full min-w-0 bg-card border border-border/30 text-foreground outline-none transition-all",
            isHero
              ? "h-14 rounded-2xl pl-11 pr-10 text-[15px] font-medium shadow-lg focus:ring-2 focus:ring-primary/30 sm:text-base"
              : "h-12 rounded-2xl pl-10 pr-9 text-sm font-medium shadow-sm focus:ring-2 focus:ring-primary/20"
          )}
        />
        {query && (
          <button
            onClick={clearQuery}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-muted flex items-center justify-center"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 bg-card border border-border/20 rounded-2xl shadow-xl z-50 max-h-[60vh] overflow-y-auto"
          >
            {/* Suggestions when no query */}
            {!query.trim() && suggestions.length > 0 && (
              <div className="p-3">
                <SuggestionsList suggestions={suggestions} onClick={handleSuggestionClick} />
              </div>
            )}

            {/* Autocomplete results */}
            {query.trim() && autocomplete.map((group) => (
              <AutocompleteSection key={group.type} group={group} onClick={handleResultClick} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Suggestions List ──
function SuggestionsList({
  suggestions,
  onClick,
}: {
  suggestions: SearchSuggestion[];
  onClick: (s: SearchSuggestion) => void;
}) {
  const grouped = {
    recent: suggestions.filter((s) => s.type === "recent"),
    contextual: suggestions.filter((s) => s.type === "contextual"),
    trending: suggestions.filter((s) => s.type === "trending"),
  };

  return (
    <div className="space-y-3">
      {grouped.recent.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Recent</p>
          <div className="flex flex-wrap gap-1.5">
            {grouped.recent.map((s, i) => (
              <button
                key={`r-${i}`}
                onClick={() => onClick(s)}
                className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-foreground active:scale-95 transition-transform"
              >
                <Clock className="w-3 h-3 text-muted-foreground" />
                {s.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {grouped.contextual.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">
            <Sparkles className="w-3 h-3 inline mr-1" />Suggested now
          </p>
          <div className="flex flex-wrap gap-1.5">
            {grouped.contextual.map((s, i) => (
              <button
                key={`c-${i}`}
                onClick={() => onClick(s)}
                className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary active:scale-95 transition-transform"
              >
                <span>{s.icon}</span>
                {s.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {grouped.trending.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">
            <TrendingUp className="w-3 h-3 inline mr-1" />Trending
          </p>
          <div className="flex flex-wrap gap-1.5">
            {grouped.trending.map((s, i) => (
              <button
                key={`t-${i}`}
                onClick={() => onClick(s)}
                className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-foreground active:scale-95 transition-transform"
              >
                <TrendingUp className="w-3 h-3 text-orange-500" />
                {s.text}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Autocomplete Section ──
function AutocompleteSection({
  group,
  onClick,
}: {
  group: AutocompleteGroup;
  onClick: (r: SearchResult) => void;
}) {
  const icons = {
    categories: "📂",
    locations: "📍",
    shops: "🏪",
    products: "📦",
  };

  return (
    <div className="border-b border-border/10 last:border-0">
      <p className="px-4 pt-3 pb-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
        {icons[group.type]} {group.label}
      </p>
      {group.items.map((item) => (
        <button
          key={item.id}
          onClick={() => onClick(item)}
          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 active:bg-muted transition-colors text-left"
        >
          {item.imageUrl ? (
            <img src={item.imageUrl} alt="" className="w-9 h-9 rounded-xl object-cover bg-muted shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground break-words line-clamp-2 leading-snug">{item.title}</p>
            {item.subtitle && (
              <p className="text-[11px] text-muted-foreground break-words line-clamp-2 leading-snug">{item.subtitle}</p>
            )}
          </div>
          {item.price != null && (
            <span className="text-xs font-bold text-primary shrink-0">
              {item.price.toFixed(2)} {item.currency}
            </span>
          )}
          {item.rating != null && (
            <span className="text-[11px] text-muted-foreground shrink-0">
              ⭐ {item.rating.toFixed(1)}
            </span>
          )}
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        </button>
      ))}
    </div>
  );
}
