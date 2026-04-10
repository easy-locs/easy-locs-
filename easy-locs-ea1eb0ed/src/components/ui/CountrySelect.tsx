import { useState, useMemo, useRef, useEffect } from "react";
import { getAllCountryEntries, getLocalizedCountryName, type CountryEntry } from "@/lib/global-country-registry";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, ChevronDown, X } from "lucide-react";

interface CountrySelectProps {
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const regionLabels: Record<string, string> = {
  europe: "🇪🇺 Europe",
  americas: "🌎 Americas",
  africa: "🌍 Africa",
  middle_east: "🌙 Middle East",
  asia_pacific: "🌏 Asia-Pacific",
};

const regionOrder = ["europe", "americas", "africa", "middle_east", "asia_pacific"];

export default function CountrySelect({ value, onChange, placeholder = "Select a country…", className = "", disabled }: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const allCountries = useMemo(() => getAllCountryEntries(), []);

  // Build localized entries once
  const localizedEntries = useMemo(() => {
    return allCountries.map(c => ({
      ...c,
      localName: getLocalizedCountryName(c.code),
    }));
  }, [allCountries]);

  const selected = useMemo(() => localizedEntries.find(c => c.code === value), [value, localizedEntries]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return localizedEntries;
    return localizedEntries.filter(c =>
      c.localName.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.flag.includes(q)
    );
  }, [search, localizedEntries]);

  const grouped = useMemo(() => {
    const map: Record<string, (CountryEntry & { localName: string })[]> = {};
    for (const c of filtered) {
      if (!map[c.region]) map[c.region] = [];
      map[c.region].push(c);
    }
    return map;
  }, [filtered]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px]"
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {selected ? (
            <>
              <span className="text-lg shrink-0">{selected.flag}</span>
              <span className="min-w-0 whitespace-normal break-words leading-snug">{selected.localName}</span>
              <span className="text-muted-foreground text-xs shrink-0">({selected.code})</span>
            </>
          ) : (
            <span className="text-muted-foreground whitespace-normal break-words">{placeholder}</span>
          )}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {value && (
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
              className="text-muted-foreground hover:text-foreground p-0.5"
            >
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search country…"
                className="pl-8 h-9 text-sm"
              />
            </div>
          </div>
          <ScrollArea className="max-h-[280px]">
            {filtered.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No country found</div>
            ) : (
              <div className="py-1">
                {regionOrder.map(region => {
                  const countries = grouped[region];
                  if (!countries?.length) return null;
                  return (
                    <div key={region}>
                      <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30 sticky top-0">
                        {regionLabels[region] || region}
                      </div>
                      {countries.map(c => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => { onChange(c.code); setOpen(false); setSearch(""); }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent/10 transition-colors ${
                            value === c.code ? "bg-accent/20 font-medium" : ""
                          }`}
                        >
                          <span className="text-lg shrink-0">{c.flag}</span>
                          <span className="flex-1 min-w-0 text-left whitespace-normal break-words leading-snug">{c.localName}</span>
                          <span className="text-xs text-muted-foreground shrink-0">{c.code}</span>
                          <span className="text-xs text-muted-foreground shrink-0">{c.currencySymbol}</span>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
