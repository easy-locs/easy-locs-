/**
 * SmartMenuRenderer — Premium menu display driven by Menu Intelligence Engine.
 * Consumes raw menu items and renders a structured, clean, conversion-optimized menu.
 */
import { useMemo } from "react";
import { processMenuIntelligence, type RawMenuItem, type SmartMenuSection } from "@/lib/engines/menu-intelligence-engine";
import { Star } from "lucide-react";

interface SmartMenuRendererProps {
  items: RawMenuItem[];
  subcategory?: string;
  currency?: string;
  maxBestsellers?: number;
  className?: string;
}

export function SmartMenuRenderer({
  items,
  subcategory,
  currency = "AED",
  maxBestsellers = 4,
  className = "",
}: SmartMenuRendererProps) {
  const result = useMemo(
    () => processMenuIntelligence(items, { maxBestsellers, subcategory }),
    [items, maxBestsellers, subcategory]
  );

  if (!result.sections.length) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No menu items available
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {result.sections.map(section => (
        <MenuSection
          key={section.key}
          section={section}
          currency={currency}
        />
      ))}
    </div>
  );
}

function MenuSection({ section, currency }: { section: SmartMenuSection; currency: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <span className="text-lg">{section.emoji}</span>
        <h3 className="text-base font-bold text-foreground tracking-tight">
          {section.label}
        </h3>
        <span className="text-xs text-muted-foreground">
          {section.items.length}
        </span>
      </div>
      <div className="space-y-2">
        {section.items.map((item, idx) => (
          <MenuItemCard
            key={item.id ?? `${section.key}-${idx}`}
            item={item}
            currency={currency}
          />
        ))}
      </div>
    </div>
  );
}

function MenuItemCard({
  item,
  currency,
}: {
  item: RawMenuItem & {
    cleanName: string;
    cleanDescription: string;
    isAutoBestseller: boolean;
    hasValidImage: boolean;
  };
  currency: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-card border border-border/30 p-3 transition-shadow hover:shadow-sm">
      {/* Image */}
      {item.hasValidImage && item.photo_url ? (
        <img
          src={item.photo_url}
          alt={item.cleanName}
          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
          loading="lazy"
        />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-muted/50 flex-shrink-0 flex items-center justify-center">
          <span className="text-2xl opacity-30">🍽️</span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-foreground truncate">
                {item.cleanName}
              </span>
              {item.isAutoBestseller && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-semibold flex-shrink-0">
                  <Star className="w-2.5 h-2.5" />
                  Best
                </span>
              )}
            </div>
            {item.cleanDescription && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {item.cleanDescription}
              </p>
            )}
          </div>
          {item.price != null && item.price > 0 && (
            <span className="text-sm font-bold text-foreground flex-shrink-0">
              {item.price} {currency}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
