/**
 * CanonicalAddressInput — Global address input with autocomplete.
 * Uses the canonical CanonicalPlace type for all address selection.
 * Supports: autocomplete, saved places, airport quick results, landmarks.
 */
import { useState, useRef, useEffect } from "react";
import { MapPin, Home, Briefcase, Clock, Plane, Search, X } from "lucide-react";
import { useAddressSearch } from "@/hooks/useAddressSearch";
import { useSmartLocation, type SavedPlace } from "@/hooks/useSmartLocation";
import {
  type CanonicalPlace,
  fromNormalizedPlace,
  fromSavedPlace,
  resolveAirportPlace,
} from "@/lib/address/canonical-place";

interface Props {
  value: CanonicalPlace | null;
  onChange: (place: CanonicalPlace | null) => void;
  placeholder?: string;
  allowAirport?: boolean;
  allowSavedPlaces?: boolean;
  className?: string;
}

export function CanonicalAddressInput({
  value,
  onChange,
  placeholder = "Search address…",
  allowAirport = false,
  allowSavedPlaces = true,
  className = "",
}: Props) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { results, loading } = useAddressSearch(query, { enabled: focused && query.length >= 2 });
  const { home, work, recents, currentLocation } = useSmartLocation();

  // Close dropdown on outside click
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectPlace = (place: CanonicalPlace) => {
    onChange(place);
    setQuery("");
    setFocused(false);
  };

  const selectSaved = (sp: SavedPlace) => {
    const cp = fromSavedPlace(sp);
    if (cp) selectPlace(cp);
  };

  const clear = () => {
    onChange(null);
    setQuery("");
    inputRef.current?.focus();
  };

  // Airport quick check
  const airportMatch = allowAirport && query.length >= 3 ? resolveAirportPlace(query) : null;

  const showDropdown = focused && (query.length >= 2 || allowSavedPlaces);

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {/* Input field */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
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
          className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-border/30 bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
        />
        {(value || query) && (
          <button
            onClick={clear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted/60"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute z-50 top-full mt-1 w-full bg-card border border-border/30 rounded-xl shadow-lg overflow-hidden max-h-72 overflow-y-auto">
          {/* Saved places */}
          {allowSavedPlaces && query.length < 2 && (
            <div className="p-2 space-y-0.5">
              {currentLocation && (
                <DropdownItem
                  icon={<MapPin className="h-4 w-4 text-primary" />}
                  label="Current location"
                  sub={currentLocation.address}
                  onClick={() => selectSaved(currentLocation)}
                />
              )}
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
              {recents.slice(0, 3).map((r) => (
                <DropdownItem
                  key={r.id}
                  icon={<Clock className="h-4 w-4 text-muted-foreground" />}
                  label={r.label}
                  sub={r.address}
                  onClick={() => selectSaved(r)}
                />
              ))}
            </div>
          )}

          {/* Airport match */}
          {airportMatch && (
            <div className="px-2 pb-1">
              <DropdownItem
                icon={<Plane className="h-4 w-4 text-accent-foreground" />}
                label={airportMatch.label}
                sub={airportMatch.formatted_address}
                onClick={() => selectPlace(airportMatch)}
              />
            </div>
          )}

          {/* Search results */}
          {loading && (
            <p className="text-xs text-muted-foreground text-center py-3">Searching…</p>
          )}
          {!loading && results.length > 0 && (
            <div className="p-2 space-y-0.5 border-t border-border/10">
              {results.map((r, i) => (
                <DropdownItem
                  key={i}
                  icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
                  label={r.label}
                  sub={[r.area, r.city, r.country].filter(Boolean).join(", ")}
                  onClick={() => selectPlace(fromNormalizedPlace(r))}
                />
              ))}
            </div>
          )}
          {!loading && query.length >= 2 && results.length === 0 && !airportMatch && (
            <p className="text-xs text-muted-foreground text-center py-3">No results found</p>
          )}
        </div>
      )}
    </div>
  );
}

function DropdownItem({
  icon,
  label,
  sub,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
    >
      {icon}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">{label}</p>
        {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
      </div>
    </button>
  );
}
