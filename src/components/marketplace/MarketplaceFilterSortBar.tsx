import { useMemo } from "react";

type MarketplaceFilterSortBarProps = {
  sort: string;
  onSortChange: (v: string) => void;
  filter: string;
  onFilterChange: (v: string) => void;
  options?: string[];
};

export function MarketplaceFilterSortBar({
  sort,
  onSortChange,
  filter,
  onFilterChange,
  options = ["all", "featured", "fast", "top-rated"],
}: MarketplaceFilterSortBarProps) {
  const labels = useMemo(
    () => ({
      all: "All",
      featured: "Featured",
      fast: "Fast",
      "top-rated": "Top Rated",
    }),
    []
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onFilterChange(opt)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-transform active:scale-95 ${
              filter === opt
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground"
            }`}
          >
            {labels[opt as keyof typeof labels] ?? opt}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
            Sort
          </div>
          <div className="text-xs font-bold text-foreground">{sort}</div>
        </div>

        <div className="flex gap-1 ml-auto">
          {["Recommended", "Fastest", "Nearest"].map((value) => (
            <button
              key={value}
              onClick={() => onSortChange(value)}
              className={`rounded-xl px-3 py-2 text-[11px] font-bold transition-transform active:scale-95 ${
                sort === value
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-foreground"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
