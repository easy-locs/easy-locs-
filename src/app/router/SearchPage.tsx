import { useEffect } from "react";
import { AppPageShell } from "@/components/layout/AppPageShell";
import { ListingSearchPanel } from "@/components/search/ListingSearchPanel";
import { ListingSearchResults } from "@/components/search/ListingSearchResults";
import { SavedSearchPanel } from "@/components/search/SavedSearchPanel";
import { useSavedSearchStore } from "@/stores/savedSearchStore";
import { useSavedSearchesRealtime } from "@/hooks/useSavedSearchesRealtime";

export default function SearchPage() {
  const hydrateSavedSearches = useSavedSearchStore((s) => s.hydrate);

  useSavedSearchesRealtime();

  useEffect(() => {
    void hydrateSavedSearches();
  }, [hydrateSavedSearches]);

  return (
    <AppPageShell title="Search">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ListingSearchPanel />
        <ListingSearchResults />
        <SavedSearchPanel />
      </div>
    </AppPageShell>
  );
}
