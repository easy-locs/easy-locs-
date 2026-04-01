/**
 * SmartSearchBar — Premium glass search bar for the SuperMap.
 * Handles input, suggestions, brand/service intent display.
 */
import { useState, useRef, useEffect } from "react";
import { Search, X, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSmartMapStore } from "@/stores/smartMapStore";
import { useSmartMapSearch } from "@/hooks/map/useSmartMapSearch";
import { detectMapSearchIntent } from "@/lib/map/smart-map-search";

export default function SmartSearchBar() {
  const inputRef = useRef<HTMLInputElement>(null);
  const rawQuery = useSmartMapStore(s => s.search.rawQuery);
  const intent = useSmartMapStore(s => s.search.intent);
  const status = useSmartMapStore(s => s.search.status);
  const searchFocused = useSmartMapStore(s => s.searchFocused);
  const setSearchFocused = useSmartMapStore(s => s.setSearchFocused);
  const { debouncedSearch, clearSearch } = useSmartMapSearch();
  const [localValue, setLocalValue] = useState("");

  useEffect(() => {
    setLocalValue(rawQuery);
  }, [rawQuery]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalValue(val);
    debouncedSearch(val);
  };

  const handleClear = () => {
    setLocalValue("");
    clearSearch();
    inputRef.current?.focus();
  };

  const intentLabel = intent?.type === "brand"
    ? intent.brand.canonicalName
    : intent?.type === "service"
      ? intent.token.iconLabel
      : null;

  const intentEmoji = intent?.type === "brand"
    ? "🏪"
    : intent?.type === "service"
      ? intent.token.iconEmoji
      : null;

  return (
    <div className="relative w-full">
      <div
        className={cn(
          "flex h-14 items-center gap-3 rounded-[20px] border px-4 shadow-lg backdrop-blur-xl transition-all duration-160",
          searchFocused
            ? "border-primary/30 bg-[rgba(10,16,30,0.92)] shadow-primary/10"
            : "border-white/[0.08] bg-[rgba(10,16,30,0.82)]",
        )}
      >
        <Search className="h-5 w-5 shrink-0 text-white/40" />

        {intentLabel && status === "searching" && (
          <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
            {intentEmoji} {intentLabel}
          </span>
        )}

        <input
          ref={inputRef}
          type="text"
          value={localValue}
          onChange={handleChange}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
          placeholder="Rechercher un lieu, service, marque…"
          className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-white placeholder:text-white/30 outline-none"
          autoComplete="off"
          autoCorrect="off"
        />

        {localValue.length > 0 ? (
          <button
            type="button"
            onClick={handleClear}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.08] active:scale-95 transition-transform"
          >
            <X className="h-3.5 w-3.5 text-white/50" />
          </button>
        ) : (
          <Mic className="h-[18px] w-[18px] shrink-0 text-white/30" />
        )}
      </div>

      {/* Intent suggestion pill */}
      {searchFocused && localValue.length >= 2 && intent && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 rounded-2xl border border-white/[0.06] bg-[rgba(8,12,24,0.96)] p-3 shadow-2xl backdrop-blur-xl">
          {intent.type === "brand" && (
            <div className="flex items-center gap-3">
              {intent.brand.logoUrl ? (
                <img src={intent.brand.logoUrl} alt="" className="h-8 w-8 rounded-lg object-contain bg-white/90 p-1" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg text-lg" style={{ backgroundColor: intent.brand.primaryColor + "20" }}>
                  🏪
                </div>
              )}
              <div>
                <div className="text-sm font-semibold text-white">{intent.brand.canonicalName}</div>
                <div className="text-[11px] text-white/40">Recherche de la marque à proximité</div>
              </div>
            </div>
          )}
          {intent.type === "service" && (
            <div className="flex items-center gap-3">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg text-lg"
                style={{ backgroundColor: intent.token.primaryColor + "20" }}
              >
                {intent.token.iconEmoji}
              </div>
              <div>
                <div className="text-sm font-semibold text-white">{intent.token.iconLabel}</div>
                <div className="text-[11px] text-white/40">Services à proximité</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
