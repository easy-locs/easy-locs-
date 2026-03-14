/**
 * OrbitCurrencySelector — Full 120+ currency picker with search and region grouping
 */
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Search, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  SUPPORTED_CURRENCIES,
  FEATURED_CURRENCIES,
  getCurrencyRegions,
} from "@/lib/orbit-payments/types";

interface Props {
  selected: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}

export default function OrbitCurrencySelector({ selected, onSelect, onClose }: Props) {
  const [search, setSearch] = useState("");
  const regions = useMemo(() => getCurrencyRegions(), []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return Object.entries(SUPPORTED_CURRENCIES).filter(([code, info]) => {
      if (!q) return true;
      return (
        code.toLowerCase().includes(q) ||
        info.name.toLowerCase().includes(q) ||
        info.symbol.toLowerCase().includes(q) ||
        (info.region?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [search]);

  const grouped = useMemo(() => {
    if (search.trim()) return null; // flat list when searching
    const map = new Map<string, [string, typeof SUPPORTED_CURRENCIES[string]][]>();
    regions.forEach((r) => map.set(r, []));
    filtered.forEach(([code, info]) => {
      const r = info.region || "Other";
      if (!map.has(r)) map.set(r, []);
      map.get(r)!.push([code, info]);
    });
    return map;
  }, [filtered, regions, search]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      className="flex flex-col h-full max-h-[70vh] max-w-md mx-auto"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-base font-bold text-foreground">Select Currency</h2>
          <p className="text-xs text-muted-foreground">{Object.keys(SUPPORTED_CURRENCIES).length}+ currencies supported</p>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search currency or region..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm bg-card border-border"
            autoFocus
          />
        </div>
      </div>

      {/* Featured row */}
      {!search.trim() && (
        <div className="px-4 pb-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Featured</p>
          <div className="flex gap-1.5 flex-wrap">
            {FEATURED_CURRENCIES.map((code) => {
              const info = SUPPORTED_CURRENCIES[code];
              return (
                <button
                  key={code}
                  onClick={() => onSelect(code)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    selected === code
                      ? "bg-accent text-accent-foreground border-accent"
                      : "bg-card text-foreground border-border hover:border-accent/40"
                  }`}
                >
                  {info.symbol} {code}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Currency list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {search.trim() ? (
          // Flat search results
          <div className="space-y-0.5">
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No currencies found</p>
            )}
            {filtered.map(([code, info]) => (
              <CurrencyRow key={code} code={code} info={info} selected={selected === code} onSelect={onSelect} />
            ))}
          </div>
        ) : (
          // Grouped by region
          regions.map((region) => {
            const items = grouped?.get(region);
            if (!items?.length) return null;
            return (
              <div key={region} className="mb-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1 mt-3">{region}</p>
                <div className="space-y-0.5">
                  {items.map(([code, info]) => (
                    <CurrencyRow key={code} code={code} info={info} selected={selected === code} onSelect={onSelect} />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}

function CurrencyRow({
  code,
  info,
  selected,
  onSelect,
}: {
  code: string;
  info: { symbol: string; name: string };
  selected: boolean;
  onSelect: (code: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(code)}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
        selected ? "bg-accent/10 text-accent font-semibold" : "hover:bg-muted text-foreground"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="w-8 text-center font-medium text-muted-foreground">{info.symbol}</span>
        <div className="text-left">
          <span className="font-medium">{code}</span>
          <span className="ml-2 text-muted-foreground text-xs">{info.name}</span>
        </div>
      </div>
      {selected && <Check className="w-4 h-4 text-accent" />}
    </button>
  );
}
