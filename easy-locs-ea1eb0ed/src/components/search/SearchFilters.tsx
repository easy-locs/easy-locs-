import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useUnifiedSearchStore } from "@/lib/search-engine/search-store";
import { SlidersHorizontal, X, Star, DollarSign } from "lucide-react";
import type { SearchResultType } from "@/lib/search-engine/search-types";

const TYPE_OPTIONS: { key: SearchResultType; labelKey: string; fallback: string }[] = [
  { key: "shop", labelKey: "search.type_shops", fallback: "Shops" },
  { key: "product", labelKey: "search.type_products", fallback: "Products" },
  { key: "property", labelKey: "search.type_properties", fallback: "Properties" },
  { key: "service", labelKey: "search.type_services", fallback: "Services" },
  { key: "profile", labelKey: "search.type_people", fallback: "People" },
];

const RATING_OPTIONS = [0, 3, 3.5, 4, 4.5];

export default function SearchFilters() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const state = useUnifiedSearchStore((s) => s.state);
  const setFilters = useUnifiedSearchStore((s) => s.setFilters);
  const search = useUnifiedSearchStore((s) => s.search);

  const hasActiveFilters = !!(state.minRating || state.priceMin || state.priceMax || state.types?.length);

  const handleTypeToggle = (type: SearchResultType) => {
    const current = state.types ?? [];
    const next = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    setFilters({ types: next.length > 0 ? next : undefined });
  };

  const handleApply = () => {
    setOpen(false);
    search();
  };

  const handleReset = () => {
    setFilters({ minRating: undefined, priceMin: undefined, priceMax: undefined, types: undefined });
    setOpen(false);
    search();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95"
        style={{
          background: hasActiveFilters ? "hsla(38, 65%, 56%, 0.15)" : "hsl(220 30% 16%)",
          color: hasActiveFilters ? "hsl(38 65% 56%)" : "hsl(220 20% 60%)",
          border: `1px solid ${hasActiveFilters ? "hsla(38, 65%, 56%, 0.3)" : "hsl(220 30% 20%)"}`,
        }}
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        {t("search.filters") || "Filters"}
        {hasActiveFilters && (
          <span
            className="w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold"
            style={{ background: "hsl(38 65% 56%)", color: "hsl(220 40% 18%)" }}
          >
            {[state.minRating ? 1 : 0, (state.priceMin || state.priceMax) ? 1 : 0, state.types?.length ? 1 : 0].reduce((a, b) => a + b, 0)}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      className="rounded-2xl p-4 space-y-4"
      style={{ background: "hsl(220 30% 12%)", border: "1px solid hsl(220 30% 18%)" }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: "hsl(38 65% 56%)" }}>
          {t("search.filters") || "Filters"}
        </h3>
        <button onClick={() => setOpen(false)} className="p-1 rounded-lg" style={{ color: "hsl(220 20% 50%)" }}>
          <X className="w-4 h-4" />
        </button>
      </div>

      <div>
        <p className="text-xs font-medium mb-2" style={{ color: "hsl(220 15% 70%)" }}>
          {t("search.filter_types") || "Result types"}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {TYPE_OPTIONS.map((opt) => {
            const active = !state.types || state.types.includes(opt.key);
            return (
              <button
                key={opt.key}
                onClick={() => handleTypeToggle(opt.key)}
                className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                style={{
                  background: active ? "hsla(38, 65%, 56%, 0.15)" : "hsl(220 30% 16%)",
                  color: active ? "hsl(38 65% 56%)" : "hsl(220 20% 50%)",
                  border: `1px solid ${active ? "hsla(38, 65%, 56%, 0.3)" : "transparent"}`,
                }}
              >
                {t(opt.labelKey) || opt.fallback}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium mb-2 flex items-center gap-1" style={{ color: "hsl(220 15% 70%)" }}>
          <Star className="w-3 h-3" />
          {t("search.filter_min_rating") || "Minimum rating"}
        </p>
        <div className="flex gap-1.5">
          {RATING_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => setFilters({ minRating: state.minRating === r ? undefined : r })}
              className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
              style={{
                background: state.minRating === r ? "hsla(38, 65%, 56%, 0.15)" : "hsl(220 30% 16%)",
                color: state.minRating === r ? "hsl(38 65% 56%)" : "hsl(220 20% 50%)",
                border: `1px solid ${state.minRating === r ? "hsla(38, 65%, 56%, 0.3)" : "transparent"}`,
              }}
            >
              {r === 0 ? (t("search.filter_any") || "Any") : `${r}+`}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium mb-2 flex items-center gap-1" style={{ color: "hsl(220 15% 70%)" }}>
          <DollarSign className="w-3 h-3" />
          {t("search.filter_price_range") || "Price range"}
        </p>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder={t("search.filter_min") || "Min"}
            value={state.priceMin ?? ""}
            onChange={(e) => setFilters({ priceMin: e.target.value ? Number(e.target.value) : undefined })}
            className="flex-1 px-3 py-1.5 rounded-lg text-xs"
            style={{
              background: "hsl(220 30% 16%)",
              color: "hsl(220 15% 80%)",
              border: "1px solid hsl(220 30% 22%)",
            }}
          />
          <span className="text-xs self-center" style={{ color: "hsl(220 20% 40%)" }}>—</span>
          <input
            type="number"
            placeholder={t("search.filter_max") || "Max"}
            value={state.priceMax ?? ""}
            onChange={(e) => setFilters({ priceMax: e.target.value ? Number(e.target.value) : undefined })}
            className="flex-1 px-3 py-1.5 rounded-lg text-xs"
            style={{
              background: "hsl(220 30% 16%)",
              color: "hsl(220 15% 80%)",
              border: "1px solid hsl(220 30% 22%)",
            }}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleReset}
          className="flex-1 py-2 rounded-xl text-xs font-medium transition-all active:scale-95"
          style={{ background: "hsl(220 30% 16%)", color: "hsl(220 20% 60%)" }}
        >
          {t("search.filter_reset") || "Reset"}
        </button>
        <button
          onClick={handleApply}
          className="flex-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
          style={{ background: "hsl(38 65% 56%)", color: "hsl(220 40% 18%)" }}
        >
          {t("search.filter_apply") || "Apply"}
        </button>
      </div>
    </div>
  );
}
