import { useState, useMemo } from "react";
import { useListingStore } from "@/stores/listingStore";
import { useListingBulkActionsStore } from "@/stores/listingBulkActionsStore";
import { Button } from "@/components/ui/button";

export function BulkListingActionsPanel() {
  const listings = useListingStore((s) => s.getMyListings());
  const loading = useListingBulkActionsStore((s) => s.loading);
  const bulkPublish = useListingBulkActionsStore((s) => s.bulkPublish);
  const bulkPause = useListingBulkActionsStore((s) => s.bulkPause);
  const bulkArchive = useListingBulkActionsStore((s) => s.bulkArchive);

  const [selected, setSelected] = useState<string[]>([]);

  const allSelected = useMemo(
    () => listings.length > 0 && selected.length === listings.length,
    [listings.length, selected.length]
  );

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Bulk Listing Actions</h3>

      <div className="flex gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelected(allSelected ? [] : listings.map((l) => l.id))}
        >
          {allSelected ? "Clear all" : "Select all"}
        </Button>
        <Button size="sm" disabled={selected.length === 0 || loading} onClick={() => void bulkPublish(selected)}>
          Publish
        </Button>
        <Button size="sm" variant="secondary" disabled={selected.length === 0 || loading} onClick={() => void bulkPause(selected)}>
          Pause
        </Button>
        <Button size="sm" variant="destructive" disabled={selected.length === 0 || loading} onClick={() => void bulkArchive(selected)}>
          Archive
        </Button>
      </div>

      <div className="space-y-1">
        {listings.map((listing) => (
          <label key={listing.id} className="flex items-center gap-2 rounded-lg border border-border p-2 cursor-pointer hover:bg-muted/50 transition-colors">
            <input
              type="checkbox"
              checked={selected.includes(listing.id)}
              onChange={() => toggle(listing.id)}
              className="rounded border-border"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground break-words leading-snug">{listing.title}</p>
              <p className="text-[10px] text-muted-foreground">{listing.status}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
