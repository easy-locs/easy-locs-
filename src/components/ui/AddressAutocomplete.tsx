import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, Loader2 } from "lucide-react";

export interface AddressResult {
  label: string;         // Full formatted address
  housenumber?: string;
  street?: string;
  postcode?: string;
  city?: string;
  context?: string;      // e.g. "75, Paris, Île-de-France"
  department?: string;   // e.g. "75"
  lat?: number;
  lng?: number;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (result: AddressResult) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  required?: boolean;
}

const AddressAutocomplete = ({
  value,
  onChange,
  onSelect,
  placeholder = "Saisissez une adresse…",
  className = "",
  label,
  required,
}: AddressAutocompleteProps) => {
  const [suggestions, setSuggestions] = useState<AddressResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const search = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=6`
      );
      const data = await res.json();
      if (data.features) {
        const results: AddressResult[] = data.features.map((f: any) => {
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
          };
        });
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
        setHighlightIndex(-1);
      }
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (val: string) => {
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
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
                <div className="font-medium">{s.label}</div>
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
};

export default AddressAutocomplete;
