/**
 * SearchableSelector — Reusable searchable dropdown for large datasets.
 * Used for countries, cities, nationalities across all forms.
 */
import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { Search, ChevronDown, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectorOption {
  value: string;
  label: string;
  sublabel?: string;
  icon?: ReactNode;
}

interface Props {
  options: SelectorOption[];
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export function SearchableSelector({
  options,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  label,
  className,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.length > 0
    ? options.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        o.value.toLowerCase().includes(query.toLowerCase()) ||
        (o.sublabel?.toLowerCase().includes(query.toLowerCase()) ?? false)
      ).slice(0, 50)
    : options.slice(0, 50);

  const selected = options.find((o) => o.value === value);

  const handleSelect = useCallback((val: string) => {
    onChange(val);
    setOpen(false);
    setQuery("");
  }, [onChange]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {label && <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>}

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground",
          "hover:border-primary/50 transition-colors",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span className={cn("min-w-0 flex-1 whitespace-normal break-words text-left leading-snug", !selected && "text-muted-foreground")}>
          {selected ? (
            <span className="flex min-w-0 items-center gap-2">
              {selected.icon}
              <span className="min-w-0 whitespace-normal break-words leading-snug">{selected.label}</span>
            </span>
          ) : placeholder}
        </span>
        {value ? (
          <X className="h-3.5 w-3.5 text-muted-foreground shrink-0 hover:text-foreground" onClick={(e) => { e.stopPropagation(); onChange(""); setOpen(false); }} />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">No results</div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent/50 transition-colors",
                    opt.value === value && "bg-accent/30"
                  )}
                >
                  {opt.icon}
                  <div className="flex-1 min-w-0">
                    <span className="block whitespace-normal break-words leading-snug">{opt.label}</span>
                    {opt.sublabel && <span className="text-[10px] text-muted-foreground block whitespace-normal break-words leading-snug">{opt.sublabel}</span>}
                  </div>
                  {opt.value === value && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
