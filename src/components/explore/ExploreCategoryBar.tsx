import { useRef, useState, useEffect, useCallback } from "react";
import { Globe, ChevronLeft, ChevronRight } from "lucide-react";
import { CATEGORY_HIERARCHY } from "@/lib/taxonomy/category-tree";
import { useI18n } from "@/lib/i18n";

interface ExploreCategoryBarProps {
  activeGroup: string;
  activeSubcategory: string;
  onGroupChange: (group: string) => void;
  onSubcategoryChange: (sub: string) => void;
  groupCounts?: Record<string, number>;
}

export function ExploreCategoryBar({ activeGroup, activeSubcategory, onGroupChange, onSubcategoryChange, groupCounts }: ExploreCategoryBarProps) {
  const { t } = useI18n();
  const activeGroupData = CATEGORY_HIERARCHY.find(g => g.value === activeGroup);
  const scrollRef = useRef<HTMLDivElement>(null);
  const subScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", checkScroll); ro.disconnect(); };
  }, [checkScroll]);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  };

  // i18n helper: try translating category keys, fallback to English label
  const tGroup = (value: string, fallback: string) => t(`explore.cat.${value}`) || fallback;
  const tSub = (value: string, fallback: string) => t(`explore.sub.${value}`) || fallback;

  return (
    <>
      {/* ── Main group bar ── */}
      <div className="relative border-t border-border/40">
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center">
            <div className="w-12 h-full bg-gradient-to-r from-background to-transparent pointer-events-none absolute inset-0" />
            <button onClick={() => scroll("left")} className="relative z-10 ml-1 p-1 rounded-full bg-background border border-border shadow-sm hover:shadow-md transition-shadow">
              <ChevronLeft className="h-4 w-4 text-foreground" />
            </button>
          </div>
        )}

        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center">
            <div className="w-12 h-full bg-gradient-to-l from-background to-transparent pointer-events-none absolute inset-0" />
            <button onClick={() => scroll("right")} className="relative z-10 mr-1 p-1 rounded-full bg-background border border-border shadow-sm hover:shadow-md transition-shadow">
              <ChevronRight className="h-4 w-4 text-foreground" />
            </button>
          </div>
        )}

        <div className="max-w-[1400px] mx-auto px-4">
          <div ref={scrollRef} className="flex items-center gap-1 overflow-x-auto scrollbar-none py-2.5 -mx-1 scroll-smooth">
            <CategoryTab
              active={activeGroup === "all"}
              emoji={<Globe className="h-5 w-5" />}
              label={t("explore.all") || "All"}
              count={groupCounts?.all}
              onClick={() => { onGroupChange("all"); onSubcategoryChange("all"); }}
            />
            {CATEGORY_HIERARCHY.map(group => (
              <CategoryTab
                key={group.value}
                active={activeGroup === group.value}
                emoji={<span className="text-lg leading-none">{group.emoji}</span>}
                label={tGroup(group.value, group.label)}
                count={groupCounts?.[group.value]}
                onClick={() => { onGroupChange(group.value); onSubcategoryChange("all"); }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Sub-category bar ── */}
      {activeGroup !== "all" && activeGroupData && (
        <div className="border-t border-border/30 bg-muted/20">
          <div className="max-w-[1400px] mx-auto px-4">
            <div ref={subScrollRef} className="flex items-center gap-2 overflow-x-auto scrollbar-none py-2">
              <SubCategoryChip
                active={activeSubcategory === "all"}
                label={`${t("explore.all") || "All"} ${tGroup(activeGroupData.value, activeGroupData.label)}`}
                onClick={() => onSubcategoryChange("all")}
              />
              {activeGroupData.subcategories.map(sub => (
                <SubCategoryChip
                  key={sub.value}
                  active={activeSubcategory === sub.value}
                  emoji={sub.emoji}
                  label={tSub(sub.value, sub.label)}
                  onClick={() => onSubcategoryChange(sub.value)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Tab component (main row) ── */
function CategoryTab({ active, emoji, label, count, onClick }: {
  active: boolean;
  emoji: React.ReactNode;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs transition-all min-w-[68px] min-h-[56px] relative group ${
        active
          ? "text-foreground font-semibold"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      }`}
    >
      <span className="transition-transform group-hover:scale-110">{emoji}</span>
      <span className="truncate max-w-[76px] leading-none">{label}</span>
      {active && (
        <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-foreground" />
      )}
    </button>
  );
}

/* ── Chip component (sub row) ── */
function SubCategoryChip({ active, emoji, label, onClick }: {
  active: boolean;
  emoji?: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
        active
          ? "bg-foreground text-background shadow-sm"
          : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
      }`}
    >
      {emoji && <span>{emoji}</span>}
      {label}
    </button>
  );
}
