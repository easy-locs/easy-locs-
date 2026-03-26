import { useSearchStore } from "@/stores/searchStore";

export function ListingSearchPanel() {
  const filters = useSearchStore((s) => s.filters);
  const setFilters = useSearchStore((s) => s.setFilters);
  const runSearch = useSearchStore((s) => s.runSearch);
  const clear = useSearchStore((s) => s.clear);

  return (
    <div className="space-y-3 p-4">
      <h3 className="text-sm font-semibold text-foreground">Search Listings</h3>

      <input
        className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60"
        placeholder="City"
        value={filters.city ?? ""}
        onChange={(e) => setFilters({ city: e.target.value || undefined })}
      />

      <input
        className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60"
        placeholder="Text search"
        value={filters.text ?? ""}
        onChange={(e) => setFilters({ text: e.target.value || undefined })}
      />

      <div className="flex gap-2">
        <input
          className="w-1/2 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60"
          placeholder="Min price"
          type="number"
          value={filters.minNightPrice ?? ""}
          onChange={(e) =>
            setFilters({
              minNightPrice: e.target.value ? Number(e.target.value) : undefined,
            })
          }
        />
        <input
          className="w-1/2 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60"
          placeholder="Max price"
          type="number"
          value={filters.maxNightPrice ?? ""}
          onChange={(e) =>
            setFilters({
              maxNightPrice: e.target.value ? Number(e.target.value) : undefined,
            })
          }
        />
      </div>

      <div className="flex gap-2">
        <button
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          onClick={runSearch}
        >
          Search
        </button>
        <button
          className="rounded-xl bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
          onClick={clear}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
