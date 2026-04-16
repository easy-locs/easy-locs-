import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, X, RotateCcw } from "lucide-react";
import { useI18n, tSafe } from "@/lib/i18n";
import {
  getFiltersForVertical, getDefaultFilterValues,
  type RadarFilterDef, type RadarFilterValues,
} from "@/lib/radar/radar-filter-schemas";
import type { RadarVertical } from "@/lib/radar/radar-result-item";

interface Props {
  vertical: RadarVertical;
  values: RadarFilterValues;
  onChange: (values: RadarFilterValues) => void;
  resultCount?: number;
}

export default function RadarFilters({ vertical, values, onChange, resultCount }: Props) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const filters = getFiltersForVertical(vertical);
  const defaults = getDefaultFilterValues(vertical);

  const activeCount = Object.entries(values).filter(([k, v]) => {
    const def = defaults[k];
    return v !== def && v !== undefined && v !== "" && v !== false;
  }).length;

  const setValue = useCallback((id: string, val: unknown) => {
    onChange({ ...values, [id]: val });
  }, [values, onChange]);

  const resetAll = useCallback(() => {
    onChange(defaults);
  }, [defaults, onChange]);

  const chipFilters = filters.filter(f => f.type === "chip" || f.type === "toggle");
  const expandedFilters = filters.filter(f => f.type === "range" || f.type === "select" || f.type === "date_range");

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setExpanded(!expanded)}
          aria-label="Toggle filters"
          aria-expanded={expanded}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.625rem] font-bold whitespace-nowrap border transition-all active:scale-95 shrink-0"
          style={{
            background: activeCount > 0 ? "hsl(var(--accent) / 0.12)" : "hsl(var(--card) / 0.8)",
            borderColor: activeCount > 0 ? "hsl(var(--accent) / 0.3)" : "hsl(var(--border) / 0.15)",
            color: activeCount > 0 ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))",
          }}
        >
          <SlidersHorizontal className="w-3 h-3" />
          {tSafe(t, "radar.filters", "Filters")}
          {activeCount > 0 && (
            <span className="ml-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[0.5625rem] font-extrabold" style={{ background: "hsl(var(--accent))", color: "white" }}>
              {activeCount}
            </span>
          )}
        </button>

        <div className="flex gap-1.5 overflow-x-auto scrollbar-none flex-1">
          {chipFilters.slice(0, 4).map(f => (
            <FilterChip key={f.id} filter={f} value={values[f.id]} onChange={v => setValue(f.id, v)} />
          ))}
        </div>

        {activeCount > 0 && (
          <button
            onClick={resetAll}
            aria-label="Reset filters"
            className="flex items-center gap-1 px-2 py-1 rounded-full text-[0.625rem] font-semibold text-muted-foreground/70 active:scale-95 transition-all shrink-0"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            {tSafe(t, "radar.reset", "Reset")}
          </button>
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border p-3 space-y-3" style={{ background: "hsl(var(--card) / 0.95)", borderColor: "hsl(var(--border) / 0.15)" }}>
              <div className="flex items-center justify-between">
                <span className="text-[0.6875rem] font-bold text-foreground">
                  {tSafe(t, "radar.all_filters", "All Filters")}
                </span>
                <button onClick={() => setExpanded(false)} aria-label="Close filters" className="p-1 rounded-lg active:scale-90 transition-transform">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>

              {filters.map(f => (
                <FilterRow key={f.id} filter={f} value={values[f.id]} onChange={v => setValue(f.id, v)} />
              ))}

              {resultCount != null && (
                <div className="pt-2 border-t" style={{ borderColor: "hsl(var(--border) / 0.1)" }}>
                  <span className="text-[0.625rem] text-muted-foreground">
                    {resultCount} {tSafe(t, "radar.results", "results")}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterChip({ filter, value, onChange }: { filter: RadarFilterDef; value: unknown; onChange: (v: unknown) => void }) {
  if (filter.type === "toggle") {
    const active = value === true;
    return (
      <button
        onClick={() => onChange(!active)}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[0.625rem] font-semibold whitespace-nowrap border transition-all shrink-0 active:scale-95"
        style={{
          background: active ? "hsl(var(--accent) / 0.12)" : "hsl(var(--card) / 0.6)",
          borderColor: active ? "hsl(var(--accent) / 0.3)" : "hsl(var(--border) / 0.15)",
          color: active ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))",
        }}
      >
        {filter.label}
      </button>
    );
  }

  if (filter.type === "chip" && filter.options) {
    const selected = value as string | undefined;
    return (
      <>
        {filter.options.slice(0, 3).map(opt => {
          const active = selected === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(active ? "" : opt.value)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[0.625rem] font-semibold whitespace-nowrap border transition-all shrink-0 active:scale-95"
              style={{
                background: active ? "hsl(var(--accent) / 0.12)" : "hsl(var(--card) / 0.6)",
                borderColor: active ? "hsl(var(--accent) / 0.3)" : "hsl(var(--border) / 0.15)",
                color: active ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))",
              }}
            >
              {opt.emoji && <span>{opt.emoji}</span>}
              {opt.label}
            </button>
          );
        })}
      </>
    );
  }

  return null;
}

function FilterRow({ filter, value, onChange }: { filter: RadarFilterDef; value: unknown; onChange: (v: unknown) => void }) {
  if (filter.type === "toggle") {
    const active = value === true;
    return (
      <div className="flex items-center justify-between">
        <span className="text-[0.6875rem] font-semibold text-foreground">{filter.label}</span>
        <button
          onClick={() => onChange(!active)}
          className="w-10 h-5 rounded-full transition-all relative"
          aria-label={filter.label}
          role="switch"
          aria-checked={active}
          style={{ background: active ? "hsl(var(--accent))" : "hsl(var(--muted) / 0.3)" }}
        >
          <div
            className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
            style={{ transform: active ? "translateX(22px)" : "translateX(2px)" }}
          />
        </button>
      </div>
    );
  }

  if (filter.type === "chip" && filter.options) {
    const selected = value as string | undefined;
    return (
      <div>
        <span className="text-[0.6875rem] font-semibold text-foreground mb-1.5 block">{filter.label}</span>
        <div className="flex flex-wrap gap-1.5">
          {filter.options.map(opt => {
            const active = selected === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onChange(active ? "" : opt.value)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[0.625rem] font-semibold whitespace-nowrap border transition-all active:scale-95"
                style={{
                  background: active ? "hsl(var(--accent) / 0.12)" : "hsl(var(--card) / 0.6)",
                  borderColor: active ? "hsl(var(--accent) / 0.3)" : "hsl(var(--border) / 0.15)",
                  color: active ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))",
                }}
              >
                {opt.emoji && <span>{opt.emoji}</span>}
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (filter.type === "select" && filter.options) {
    return (
      <div className="flex items-center justify-between">
        <span className="text-[0.6875rem] font-semibold text-foreground">{filter.label}</span>
        <select
          value={(value as string) ?? ""}
          onChange={e => onChange(e.target.value)}
          className="text-[0.6875rem] font-semibold px-2 py-1 rounded-lg border bg-transparent text-foreground"
          style={{ borderColor: "hsl(var(--border) / 0.2)" }}
        >
          {filter.options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    );
  }

  if (filter.type === "range") {
    const numVal = typeof value === "number" ? value : (filter.min ?? 0);
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[0.6875rem] font-semibold text-foreground">{filter.label}</span>
          <span className="text-[0.625rem] font-extrabold tabular-nums" style={{ color: "hsl(var(--accent))" }}>
            {numVal > 0 ? numVal.toFixed(1) : "Any"}
          </span>
        </div>
        <input
          type="range"
          min={filter.min ?? 0}
          max={filter.max ?? 5}
          step={filter.step ?? 0.5}
          value={numVal}
          onChange={e => onChange(parseFloat(e.target.value))}
          className="w-full h-1 rounded-full appearance-none"
          style={{ background: "hsl(var(--muted) / 0.3)", accentColor: "hsl(var(--accent))" }}
        />
      </div>
    );
  }

  return null;
}
