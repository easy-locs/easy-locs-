import { memo, useCallback } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { UniverseCard } from "@/components/cards/UniverseCard";
import { eventBus } from "@/lib/core/event-bus";
import type { HomeShopPreview } from "@/hooks/useHomeSections";

interface ExploreEntitySectionProps {
  title: string;
  icon: string;
  items: HomeShopPreview[];
  seeAllRoute: string;
  feedKey: string;
  emptyMessage?: string;
}

function formatDistance(km?: number): string | undefined {
  if (km == null) return undefined;
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

const VERTICAL_TO_ENTITY_TYPE: Record<string, string> = {
  property: "property",
  real_estate: "property",
  hotel: "stay",
  stay: "stay",
  food: "merchant",
  grocery: "merchant",
  services: "merchant",
  beauty: "merchant",
  pharmacy: "merchant",
  shops: "merchant",
  mobility: "driver",
  utility: "service",
};

function resolveEntityType(vertical: string | null): string {
  if (!vertical) return "merchant";
  return VERTICAL_TO_ENTITY_TYPE[vertical] ?? "merchant";
}

export const ExploreEntitySection = memo(function ExploreEntitySection({
  title,
  icon,
  items,
  seeAllRoute,
  feedKey,
  emptyMessage,
}: ExploreEntitySectionProps) {
  const handleCardClick = useCallback((item: HomeShopPreview) => {
    const entityType = resolveEntityType(item.vertical);
    eventBus.emit("entity.click", {
      entityId: item.id,
      entityType,
      vertical: item.vertical ?? "",
      surface: "explore",
      slug: item.slug,
    });
  }, []);

  if (!items || items.length === 0) {
    if (!emptyMessage) return null;
    return (
      <div className="px-4 py-3">
        <h3 className="text-[13px] font-bold text-foreground mb-2 flex items-center gap-1.5">
          <span>{icon}</span> {title}
        </h3>
        <div className="flex items-center justify-center py-8 rounded-2xl bg-muted/10 border border-border/10">
          <p className="text-[11px] text-muted-foreground">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-3"
    >
      <div className="flex items-center justify-between mb-2.5 px-4">
        <h3 className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
          <span>{icon}</span> {title}
        </h3>
        <Link
          to={seeAllRoute}
          className="text-[10px] font-semibold text-primary flex items-center gap-0.5 active:opacity-70"
        >
          See all <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none px-4">
        {items.map((item) => (
          <UniverseCard
            key={item.id}
            id={item.id}
            title={item.name}
            subtitle={item.address || item.vertical || "Dubai"}
            image={item.banner_url || item.logo_url}
            rating={item.rating}
            distance={formatDistance(item.distanceKm)}
            onClick={() => handleCardClick(item)}
          />
        ))}
      </div>
    </motion.div>
  );
});
