import { Badge } from "@/components/ui/badge";
import { Search, MapPin, X, Radar } from "lucide-react";
import { getSubcategoryInfo } from "@/lib/category-hierarchy";
import { useI18n } from "@/lib/i18n";

interface ExploreFiltersStripProps {
  searchQuery: string;
  locationQuery: string;
  radius: string;
  radiusLabel: string;
  activeSubcategory: string;
  onClearSearch: () => void;
  onClearLocation: () => void;
  onClearRadius: () => void;
  onClearSubcategory: () => void;
  onClearAll: () => void;
}

export function ExploreFiltersStrip({
  searchQuery, locationQuery, radius, radiusLabel, activeSubcategory,
  onClearSearch, onClearLocation, onClearRadius, onClearSubcategory, onClearAll,
}: ExploreFiltersStripProps) {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-2 flex-wrap mb-4">
      {radius !== "worldwide" && (
        <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={onClearRadius}>
          <Radar className="h-3 w-3" /> {radiusLabel} <X className="h-3 w-3 ml-1" />
        </Badge>
      )}
      {locationQuery && (
        <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={onClearLocation}>
          <MapPin className="h-3 w-3" /> {locationQuery} <X className="h-3 w-3 ml-1" />
        </Badge>
      )}
      {activeSubcategory !== "all" && (
        <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={onClearSubcategory}>
          {getSubcategoryInfo(activeSubcategory)?.emoji} {t(`explore.sub.${activeSubcategory}`) || getSubcategoryInfo(activeSubcategory)?.label} <X className="h-3 w-3 ml-1" />
        </Badge>
      )}
      {searchQuery && (
        <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={onClearSearch}>
          <Search className="h-3 w-3" /> "{searchQuery}" <X className="h-3 w-3 ml-1" />
        </Badge>
      )}
      <button onClick={onClearAll} className="text-xs text-muted-foreground hover:text-foreground transition-colors underline">
        {t("explore.clear_all") || "Clear all"}
      </button>
    </div>
  );
}
