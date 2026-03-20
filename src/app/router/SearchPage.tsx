import { AppPageShell } from "@/components/layout/AppPageShell";
import { ListingSearchPanel } from "@/components/search/ListingSearchPanel";
import { ListingSearchResults } from "@/components/search/ListingSearchResults";

export default function SearchPage() {
  return (
    <AppPageShell title="Search">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ListingSearchPanel />
        <ListingSearchResults />
      </div>
    </AppPageShell>
  );
}
