import { useState } from "react";
import { useSavedSearchStore } from "@/stores/savedSearchStore";
import { useSearchStore } from "@/stores/searchStore";
import { Button } from "@/components/ui/button";
import { Search, Trash2 } from "lucide-react";

export function SavedSearchPanel() {
  const [name, setName] = useState("");
  const items = useSavedSearchStore((s) => s.items);
  const saveSearch = useSavedSearchStore((s) => s.saveSearch);
  const deleteSearch = useSavedSearchStore((s) => s.deleteSearch);
  const filters = useSearchStore((s) => s.filters);
  const setFilters = useSearchStore((s) => s.setFilters);
  const runSearch = useSearchStore((s) => s.runSearch);

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Saved Searches</h3>

      <div className="flex gap-2">
        <input
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          placeholder="Search name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button
          size="sm"
          onClick={() => {
            void saveSearch(name || "My search", filters);
            setName("");
          }}
        >
          Save
        </Button>
      </div>

      <div className="space-y-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-lg border border-border p-2"
          >
            <p className="text-sm font-medium text-foreground break-words line-clamp-2 leading-snug flex-1">{item.name}</p>
            <div className="flex gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  setFilters(item.filters);
                  runSearch();
                }}
              >
                <Search className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={() => void deleteSearch(item.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
