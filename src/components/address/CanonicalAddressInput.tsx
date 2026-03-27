/**
 * CanonicalAddressInput — Premium super-app address input.
 * Connected to Search Brain for all search ordering truth.
 * UI displays only — no local reranking.
 * 
 * Shows: current location → saved → recent → Search Brain ranked results
 */
import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Home, Briefcase, Clock, Plane, Search, X, Star, Navigation, Bookmark } from "lucide-react";
import { useSearchBrain } from "@/hooks/useSearchBrain";
import { useSmartLocation, type SavedPlace } from "@/hooks/useSmartLocation";
import { useCanonicalAddress } from "@/hooks/useCanonicalAddress";
import {
  type CanonicalPlace,
  fromSavedPlace,
  resolveAirportPlace,
} from "@/lib/address/canonical-place";
import type { SearchBrainResult } from "@/lib/search/search-brain";
import { cn } from "@/lib/utils";

interface Props {
  value: CanonicalPlace | null;
  onChange: (place: CanonicalPlace | null) => void;
  placeholder?: string;
  allowAirport?: boolean;
  allowSavedPlaces?: boolean;
  contextType?: string;
  contextLabel?: string;
  className?: string;
}

const LABEL_ICONS: Record<string, React.ReactNode> = {
  home: <Home className="w-4 h-4 text-primary" />,
  work: <Briefcase className="w-4 h-4 text-accent-foreground" />,
  shop: <Star className="w-4 h-4 text-warning" />,
  warehouse: <Bookmark className="w-4 h-4 text-muted-foreground" />,
};

/** Convert Search Brain result → CanonicalPlace */
function fromSearchBrainResult(r: SearchBrainResult): CanonicalPlace {
  return {
    id: r.canonical_place_id ?? r.id,
    provider: r.provider,
    provider_place_id: undefined,
    label: r.label,
    formatted_address: r.formatted_address,
    lat: r.lat,
    lng: r.lng,
    country_code: r.country_code ?? "AE",
    country_name: r.country_name,
    city: r.city,
    district: r.district,
    place_type: (r.place_type as CanonicalPlace["place_type"]) ?? "address",
    zone_key: r.zone_key,
  };
}

export function CanonicalAddressInput({
  value,
  onChange,
  placeholder = "Search address…",
  allowAirport = false,
  allowSavedPlaces = true,
  contextType,
  contextLabel,
  className = "",
}: Props) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Search Brain — single source of search ordering truth
  const { results, loading: searchLoading } = useSearchBrain(query, {
    enabled: focused && query.length >= 2,
    contextType,
  });
  const { home, work, recents, currentLocation } = useSmartLocation();
  const { savedAddresses, activateAddress } = useCanonicalAddress();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectPlace = async (place: CanonicalPlace) => {
    onChange(place);
    activateAddress(place, "manual", (contextType as any) ?? undefined);
    setQuery("");
    setFocused(false);
  };

  const selectSaved = (sp: SavedPlace) => {
    const cp = fromSavedPlace(sp);
    if (cp) selectPlace(cp);
  };

  const selectDbSaved = (addr: (typeof savedAddresses)[0]) => {
    if (!addr.place) return;
    const cp: CanonicalPlace = {
      id: addr.place.id,
      provider: addr.place.provider,
      provider_place_id: addr.place.provider_place_id,
      label: addr.label ?? addr.place.short_label ?? addr.place.formatted_address,
      formatted_address: addr.place.formatted_address,
      lat: Number(addr.place.lat),
      lng: Number(addr.place.lng),
      country_code: addr.place.country_code,
      city: addr.place.city,
      district: addr.place.district,
      postcode: addr.place.postal_code,
      timezone: addr.place.timezone,
      place_type: (addr.place.place_type as CanonicalPlace["place_type"]) ?? "address",
    };
    selectPlace(cp);
  };

  const clear = () => {
    onChange(null);
    setQuery("");
    inputRef.current?.focus();
  };

  const airportMatch = allowAirport && query.length >= 3 ? resolveAirportPlace(query) : null;
  const showDropdown = focused && (query.length >= 2 || allowSavedPlaces);

  const dbSaved = useMemo(() => {
    return savedAddresses.filter(a => a.place != null).slice(0, 5);
  }, [savedAddresses]);

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      {contextLabel && (
        <p className="text-[10px] font-semibold text-muted-foreground mb-1 px-1">{contextLabel}</p>
      )}

      <div className="relative min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 shrink-0 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={value ? value.label : query}
          onChange={(e) => {
            if (value) onChange(null);
            setQuery(e.target.value);
          }}
          onFocus={() => setFocused(true)}
          placeholder={placeholder}
          className="w-full min-w-0 h-12 pl-11 pr-10 rounded-xl border border-border/30 bg-card text-sm leading-normal text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
        />
        {(value || query) && (
          <button onClick={clear} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted/60">
            <X className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            className="absolute z-50 top-full mt-1 w-full bg-card border border-border/30 rounded-xl shadow-lg overflow-hidden max-h-80 overflow-y-auto"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
          >
            {/* Quick actions — saved + current location */}
            {allowSavedPlaces && query.length < 2 && (
              <div className="p-2 space-y-0.5">
                {currentLocation && (
                  <DropdownItem
                    icon={<Navigation className="h-4 w-4 text-primary" />}
                    label="Current location"
                    sub={currentLocation.address}
                    onClick={() => selectSaved(currentLocation)}
                    accent
                  />
                )}
                {dbSaved.length > 0 && (
                  <>
                    <div className="px-2 pt-1.5 pb-0.5">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Saved</p>
                    </div>
                    {dbSaved.map((addr) => (
                      <DropdownItem
                        key={addr.id}
                        icon={LABEL_ICONS[addr.label ?? ""] ?? <MapPin className="h-4 w-4 text-muted-foreground" />}
                        label={addr.label ?? addr.place?.short_label ?? "Address"}
                        sub={addr.place?.formatted_address}
                        detail={addr.apartment ? `Apt ${addr.apartment}` : undefined}
                        onClick={() => selectDbSaved(addr)}
                      />
                    ))}
                  </>
                )}
                {dbSaved.length === 0 && (
                  <>
                    {home?.address && (
                      <DropdownItem
                        icon={<Home className="h-4 w-4 text-primary" />}
                        label="Home"
                        sub={home.address}
                        onClick={() => selectSaved(home)}
                      />
                    )}
                    {work?.address && (
                      <DropdownItem
                        icon={<Briefcase className="h-4 w-4 text-muted-foreground" />}
                        label="Work"
                        sub={work.address}
                        onClick={() => selectSaved(work)}
                      />
                    )}
                  </>
                )}
                {recents.length > 0 && (
                  <>
                    <div className="px-2 pt-1.5 pb-0.5">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Recent</p>
                    </div>
                    {recents.slice(0, 3).map((r) => (
                      <DropdownItem
                        key={r.id}
                        icon={<Clock className="h-4 w-4 text-muted-foreground" />}
                        label={r.label}
                        sub={r.address}
                        onClick={() => selectSaved(r)}
                      />
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Airport quick match */}
            {airportMatch && (
              <div className="px-2 pb-1">
                <DropdownItem
                  icon={<Plane className="h-4 w-4 text-primary" />}
                  label={airportMatch.label}
                  sub={airportMatch.formatted_address}
                  onClick={() => selectPlace(airportMatch)}
                  accent
                />
              </div>
            )}

            {/* Search Brain results — displayed as-is, NO local reranking */}
            {searchLoading && query.length >= 2 && (
              <div className="py-4 flex justify-center">
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            )}
            {!searchLoading && results.length > 0 && (
              <div className="p-2 space-y-0.5 border-t border-border/10">
                {results.map((r) => (
                  <DropdownItem
                    key={r.id}
                    icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
                    label={r.label}
                    sub={[r.district, r.city, r.country_name].filter(Boolean).join(", ")}
                    badge={r.local_rank_bucket !== "international" ? undefined : "🌍"}
                    onClick={() => selectPlace(fromSearchBrainResult(r))}
                  />
                ))}
              </div>
            )}
            {!searchLoading && query.length >= 2 && results.length === 0 && !airportMatch && (
              <p className="text-xs text-muted-foreground text-center py-4">No results found</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Dropdown Item ──

function DropdownItem({
  icon,
  label,
  sub,
  detail,
  badge,
  onClick,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  detail?: string;
  badge?: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-colors text-left",
        accent ? "hover:bg-primary/10" : "hover:bg-muted/50"
      )}
    >
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">{label}</p>
        {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
      </div>
      {detail && <span className="text-[10px] text-muted-foreground shrink-0">{detail}</span>}
      {badge && <span className="text-xs shrink-0">{badge}</span>}
    </button>
  );
}
