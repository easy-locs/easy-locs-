import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, X, Sparkles } from "lucide-react";

interface ExploreEmptyStateProps {
  onClear: () => void;
  hasFilters: boolean;
}

export function ExploreEmptyState({ onClear, hasFilters }: ExploreEmptyStateProps) {
  return (
    <div className="text-center py-20 space-y-4">
      <div className="w-20 h-20 mx-auto rounded-3xl bg-muted/50 flex items-center justify-center">
        <Search className="h-8 w-8 text-muted-foreground/40" />
      </div>
      <h3 className="text-xl font-bold text-foreground">No listings found</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        Try adjusting your search, expanding the radius, or explore different categories. New listings are published every day from around the world!
      </p>
      {hasFilters && (
        <Button variant="outline" onClick={onClear} className="rounded-full gap-2 mt-2">
          <X className="h-4 w-4" /> Clear all filters
        </Button>
      )}
      <div className="pt-6">
        <Link to="/signup">
          <Button className="rounded-full gap-2 px-8">
            <Sparkles className="h-4 w-4" /> List your service or property
          </Button>
        </Link>
      </div>
    </div>
  );
}
