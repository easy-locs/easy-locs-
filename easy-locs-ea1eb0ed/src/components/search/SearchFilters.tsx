import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useUnifiedSearchStore } from "@/lib/search-engine/search-store";
import { RADIUS_OPTIONS } from "@/lib/search-engine/search-types";
import { SlidersHorizontal, X, Star, DollarSign, MapPin, Clock, Tag } from "lucide-react";
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
  const setRadius = useUnifiedSearchStore((s) => s.setRadius);
  const search = useUnifiedSearchStore((s) => s.search);

  const hasActiveFilters = !!(state.minRating || state.priceMin || state.priceMax || state.types?.length || state.radiusKm !== 5 || state.openNow || state.subcategory);

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
    setFilters({ minRating: undefined, priceMin: undefined, priceMax: undefined, types: undefined, openNow: undefined, subcategory: undefined });
    setRadius(5);
    setOpen(false);
    search();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95"
        style={{
          background: hasActiveFilters ? "hsl(var(--accent) / 0.1)" : "hsl(226 24% 12%)",
          color: hasActiveFilters ? "hsl(var(--accent))" : "hsl(0 0% 100% / 0.45)",
          border: `1px solid ${hasActiveFilters ? "hsl(var(--accent) / 0.2)" : "hsl(0 0% 100% / 0.06)"}`,
        }}
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        {t("search.filters") || "Filters"}
        {hasActiveFilters && (
          <span
            className="w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold"
            style={{ background: "hsl(var(--accent))", color: "hsl(228 28% 7%)" }}
          >
            {[state.minRating ? 1 : 0, (state.priceMin || state.priceMax) ? 1 : 0, state.types?.length ? 1 : 0, state.radiusKm !== 5 ? 1 : 0, state.openNow ? 1 : 0, state.subcategory ? 1 : 0].reduce((a, b) => a + b, 0)}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      className="rounded-2xl p-4 space-y-4"
      style={{ background: "hsl(226 24% 10%)", border: "1px solid hsl(0 0% 100% / 0.06)" }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: "hsl(var(--accent))" }}>
          {t("search.filters") || "Filters"}
        </h3>
        <button onClick={() => setOpen(false)} className="p-1 rounded-lg" style={{ color: "hsl(0 0% 100% / 0.4)" }}>
          <X className="w-4 h-4" />
        </button>
      </div>

      <div>
        <p className="text-xs font-medium mb-2" style={{ color: "hsl(0 0% 100% / 0.55)" }}>
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
                  background: active ? "hsl(var(--accent) / 0.1)" : "hsl(226 24% 12%)",
                  color: active ? "hsl(var(--accent))" : "hsl(0 0% 100% / 0.4)",
                  border: `1px solid ${active ? "hsl(var(--accent) / 0.2)" : "transparent"}`,
                }}
              >
                {t(opt.labelKey) || opt.fallback}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium mb-2 flex items-center gap-1" style={{ color: "hsl(0 0% 100% / 0.55)" }}>
          <Clock className="w-3 h-3" />
          {t("search.filter_availability") || "Availability"}
        </p>
        <button
          onClick={() => setFilters({ openNow: state.openNow ? undefined : true })}
          className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
          style={{
            background: state.openNow ? "hsl(var(--accent) / 0.1)" : "hsl(226 24% 12%)",
            color: state.openNow ? "hsl(var(--accent))" : "hsl(0 0% 100% / 0.4)",
            border: `1px solid ${state.openNow ? "hsl(var(--accent) / 0.2)" : "transparent"}`,
          }}
        >
          {t("search.filter_open_now") || "Open now"}
        </button>
      </div>

      <div>
        <p className="text-xs font-medium mb-2 flex items-center gap-1" style={{ color: "hsl(0 0% 100% / 0.55)" }}>
          <Tag className="w-3 h-3" />
          {t("search.filter_category") || "Category"}
        </p>
        <input
          type="text"
          placeholder={t("search.filter_category_placeholder") || "e.g. Pizza, Cleaning..."}
          value={state.subcategory ?? ""}
          onChange={(e) => setFilters({ subcategory: e.target.value || undefined })}
          className="w-full px-3 py-1.5 rounded-lg text-xs"
          style={{
            background: "hsl(226 24% 12%)",
            color: "hsl(0 0% 100% / 0.7)",
            border: "1px solid hsl(0 0% 100% / 0.06)",
            fontSize: "16px",
          }}
        />
      </div>

      <div>
        <p className="text-xs font-medium mb-2 flex items-center gap-1" style={{ color: "hsl(0 0% 100% / 0.55)" }}>
          <MapPin className="w-3 h-3" />
          {t("search.filter_radius") || "Search radius"}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r.value}
              onClick={() => setRadius(r.value)}
              className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
              style={{
                background: state.radiusKm === r.value ? "hsl(var(--accent) / 0.1)" : "hsl(226 24% 12%)",
                color: state.radiusKm === r.value ? "hsl(var(--accent))" : "hsl(0 0% 100% / 0.4)",
                border: `1px solid ${state.radiusKm === r.value ? "hsl(var(--accent) / 0.2)" : "transparent"}`,
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium mb-2 flex items-center gap-1" style={{ color: "hsl(0 0% 100% / 0.55)" }}>
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
                background: state.minRating === r ? "hsl(var(--accent) / 0.1)" : "hsl(226 24% 12%)",
                color: state.minRating === r ? "hsl(var(--accent))" : "hsl(0 0% 100% / 0.4)",
                border: `1px solid ${state.minRating === r ? "hsl(var(--accent) / 0.2)" : "transparent"}`,
              }}
            >
              {r === 0 ? (t("search.filter_any") || "Any") : `${r}+`}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium mb-2 flex items-center gap-1" style={{ color: "hsl(0 0% 100% / 0.55)" }}>
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
              background: "hsl(226 24% 12%)",
              color: "hsl(0 0% 100% / 0.7)",
              border: "1px solid hsl(0 0% 100% / 0.06)",
              fontSize: "16px",
            }}
          />
          <span className="text-xs self-center" style={{ color: "hsl(0 0% 100% / 0.3)" }}>—</span>
          <input
            type="number"
            placeholder={t("search.filter_max") || "Max"}
            value={state.priceMax ?? ""}
            onChange={(e) => setFilters({ priceMax: e.target.value ? Number(e.target.value) : undefined })}
            className="flex-1 px-3 py-1.5 rounded-lg text-xs"
            style={{
              background: "hsl(226 24% 12%)",
              color: "hsl(0 0% 100% / 0.7)",
              border: "1px solid hsl(0 0% 100% / 0.06)",
              fontSize: "16px",
            }}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleReset}
          className="flex-1 py-2 rounded-xl text-xs font-medium transition-all active:scale-95"
          style={{ background: "hsl(226 24% 12%)", color: "hsl(0 0% 100% / 0.45)" }}
        >
          {t("search.filter_reset") || "Reset"}
        </button>
        <button
          onClick={handleApply}
          className="flex-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
          style={{ background: "hsl(var(--accent))", color: "hsl(228 28% 7%)" }}
        >
          {t("search.filter_apply") || "Apply"}
        </button>
      </div>
    </div>
  );
}
