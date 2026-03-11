import { Globe } from "lucide-react";
import { CATEGORY_HIERARCHY } from "@/lib/category-hierarchy";

interface ExploreCategoryBarProps {
  activeGroup: string;
  activeSubcategory: string;
  onGroupChange: (group: string) => void;
  onSubcategoryChange: (sub: string) => void;
}

export function ExploreCategoryBar({ activeGroup, activeSubcategory, onGroupChange, onSubcategoryChange }: ExploreCategoryBarProps) {
  const activeGroupData = CATEGORY_HIERARCHY.find(g => g.value === activeGroup);

  return (
    <>
      {/* Group bar */}
      <div className="border-t border-border/50">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-3 -mx-1">
            <button
              onClick={() => { onGroupChange("all"); onSubcategoryChange("all"); }}
              className={`shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs transition-all min-w-[64px] min-h-[56px] ${
                activeGroup === "all" ? "text-foreground border-b-2 border-foreground font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Globe className="h-5 w-5" />
              <span>All</span>
            </button>
            {CATEGORY_HIERARCHY.map(group => (
              <button
                key={group.value}
                onClick={() => { onGroupChange(group.value); onSubcategoryChange("all"); }}
                className={`shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs transition-all min-w-[64px] min-h-[56px] ${
                  activeGroup === group.value ? "text-foreground border-b-2 border-foreground font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <span className="text-lg">{group.emoji}</span>
                <span className="truncate max-w-[72px] leading-none">{group.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sub-category bar */}
      {activeGroup !== "all" && activeGroupData && (
        <div className="border-t border-border/30 bg-muted/20">
          <div className="max-w-[1400px] mx-auto px-4">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-2">
              <button
                onClick={() => onSubcategoryChange("all")}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeSubcategory === "all" ? "bg-accent text-accent-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                All {activeGroupData.label}
              </button>
              {activeGroupData.subcategories.map(sub => (
                <button
                  key={sub.value}
                  onClick={() => onSubcategoryChange(sub.value)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeSubcategory === sub.value ? "bg-accent text-accent-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{sub.emoji}</span>
                  {sub.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
