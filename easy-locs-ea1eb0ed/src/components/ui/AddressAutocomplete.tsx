import { useState, useRef, useEffect, useCallback, forwardRef } from "react";
import { MapPin, Loader2 } from "lucide-react";

export interface AddressResult {
  label: string;
  housenumber?: string;
  street?: string;
  postcode?: string;
  city?: string;
  context?: string;
  department?: string;
  lat?: number;
  lng?: number;
  country?: string;
  countryCode?: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (result: AddressResult) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  required?: boolean;
  /** ISO country code to bias results (e.g. "FR", "US"). If not set, searches worldwide. */
  countryCode?: string;
}

const AddressAutocomplete = forwardRef<HTMLDivElement, AddressAutocompleteProps>(({
  value,
  onChange,
  onSelect,
  placeholder = "Enter an address…",
  className = "",
  label,
  required,
  countryCode,
}, ref) => {
  const [suggestions, setSuggestions] = useState<AddressResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const searchFrench = useCallback(async (query: string): Promise<AddressResult[]> => {
    const res = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=6`
    );
    const data = await res.json();
    if (!data.features) return [];
    return data.features.map((f: any) => {
      const props = f.properties;
      const context = props.context || "";
      const deptMatch = context.match(/^(\d{2,3})/);
      return {
        label: props.label,
        housenumber: props.housenumber,
        street: props.street,
        postcode: props.postcode,
        city: props.city,
        context,
        department: deptMatch ? deptMatch[1] : undefined,
        lat: f.geometry?.coordinates?.[1],
        lng: f.geometry?.coordinates?.[0],
        country: "France",
        countryCode: "FR",
      };
    });
  }, []);

  const searchGlobal = useCallback(async (query: string, cc?: string): Promise<AddressResult[]> => {
    // Try Photon (OpenStreetMap-based, fast, no rate-limit issues) first
    try {
      const photonParams = new URLSearchParams({ q: query, limit: "6" });
      if (cc) photonParams.set("lang", cc.toLowerCase().slice(0, 2));
      const photonRes = await fetch(`https://photon.komoot.io/api/?${photonParams}`, { signal: AbortSignal.timeout(4000) });
      const photonData = await photonRes.json();
      if (photonData.features?.length) {
        return photonData.features.map((f: any) => {
          const p = f.properties || {};
          return {
            label: [p.housenumber, p.street, p.city, p.state, p.country].filter(Boolean).join(", "),
            housenumber: p.housenumber,
            street: p.street,
            postcode: p.postcode,
            city: p.city || p.town || p.village,
            context: [p.state, p.country].filter(Boolean).join(", "),
            lat: f.geometry?.coordinates?.[1],
            lng: f.geometry?.coordinates?.[0],
            country: p.country,
            countryCode: p.countrycode?.toUpperCase(),
          };
        });
      }
    } catch {}

    // Fallback to Nominatim
    const params = new URLSearchParams({
      q: query,
      format: "json",
      addressdetails: "1",
      limit: "6",
    });
    if (cc) params.set("countrycodes", cc.toLowerCase());

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      { headers: { "Accept-Language": "en,fr,es,de,it,pt" } }
    );
    const data = await res.json();
    return data.map((item: any) => {
      const addr = item.address || {};
      return {
        label: item.display_name,
        housenumber: addr.house_number,
        street: addr.road,
        postcode: addr.postcode,
        city: addr.city || addr.town || addr.village || addr.municipality,
        context: [addr.state, addr.country].filter(Boolean).join(", "),
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        country: addr.country,
        countryCode: addr.country_code?.toUpperCase(),
      };
    });
  }, []);

  const search = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setLoading(true);
    try {
      // Use French API for France (faster & more precise), Nominatim for everything else
      const useFrench = countryCode === "FR" || (!countryCode && false);
      const results = useFrench
        ? await searchFrench(query)
        : await searchGlobal(query, countryCode);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setHighlightIndex(-1);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [countryCode, searchFrench, searchGlobal]);

  const handleChange = (val: string) => {
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 350);
  };

  const handleSelect = (result: AddressResult) => {
    onChange(result.label);
    setShowSuggestions(false);
    onSelect?.(result);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-xs font-medium text-muted-foreground mb-1">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full bg-muted/50 border border-border/50 rounded-lg pl-9 pr-8 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent ${className}`}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground animate-spin" />
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={`${s.label}-${i}`}
              type="button"
              onClick={() => handleSelect(s)}
              className={`w-full text-left px-3 py-2.5 text-sm transition-colors flex items-start gap-2 ${
                i === highlightIndex
                  ? "bg-accent/10 text-foreground"
                  : "text-foreground hover:bg-muted/50"
              }`}
            >
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <div className="font-medium line-clamp-2">{s.city ? `${s.city}${s.postcode ? ` (${s.postcode})` : ""}` : s.label}</div>
                {s.context && (
                  <div className="text-xs text-muted-foreground">{s.context}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

AddressAutocomplete.displayName = "AddressAutocomplete";

export default AddressAutocomplete;
