/**
 * ExploreBreadcrumbs — Marketplace navigation breadcrumbs.
 * Shows: Marketplace / Category / Subcategory / Location
 */
import { ChevronRight, Home } from "lucide-react";
import { CATEGORY_HIERARCHY, getSubcategoryInfo } from "@/lib/category-hierarchy";

interface Props {
  activeGroup: string;
  activeSubcategory: string;
  locationQuery?: string;
  onGroupChange: (group: string) => void;
  onSubcategoryChange: (sub: string) => void;
  onClearLocation?: () => void;
}

export default function ExploreBreadcrumbs({
  activeGroup,
  activeSubcategory,
  locationQuery,
  onGroupChange,
  onSubcategoryChange,
  onClearLocation,
}: Props) {
  const group = CATEGORY_HIERARCHY.find(g => g.value === activeGroup);
  const sub = activeSubcategory !== "all" ? getSubcategoryInfo(activeSubcategory) : null;

  // Don't show breadcrumbs if nothing is filtered
  if (activeGroup === "all" && !locationQuery) return null;

  return (
    <nav className="flex items-center gap-1.5 text-xs text-muted-foreground overflow-x-auto scrollbar-none pb-3 mb-3 border-b border-border/20">
      <button
        onClick={() => { onGroupChange("all"); onSubcategoryChange("all"); onClearLocation?.(); }}
        className="shrink-0 flex items-center gap-1 hover:text-foreground transition-colors font-medium"
      >
        <Home className="h-3 w-3" />
        Marketplace
      </button>

      {group && (
        <>
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/40" />
          <button
            onClick={() => { onGroupChange(group.value); onSubcategoryChange("all"); }}
            className={`shrink-0 hover:text-foreground transition-colors ${!sub ? "text-foreground font-semibold" : ""}`}
          >
            {group.emoji} {group.label}
          </button>
        </>
      )}

      {sub && (
        <>
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/40" />
          <span className="shrink-0 text-foreground font-semibold">
            {sub.emoji} {sub.label}
          </span>
        </>
      )}

      {locationQuery && (
        <>
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/40" />
          <button
            onClick={onClearLocation}
            className="shrink-0 text-foreground font-semibold hover:text-primary transition-colors"
          >
            📍 {locationQuery}
          </button>
        </>
      )}
    </nav>
  );
}
