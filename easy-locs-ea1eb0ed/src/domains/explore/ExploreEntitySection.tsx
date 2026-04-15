import { memo, useCallback } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { UniverseCard } from "@/components/cards/UniverseCard";
import { platformBus } from "@/lib/shared/platform-bus";
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

function formatSubtitle(item: HomeShopPreview): string {
  const raw = item.address || item.vertical || "Dubai";
  return raw.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
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
    platformBus.emit("explore:entity_clicked", {
      entityId: item.id,
      entityType,
      vertical: item.vertical ?? "",
      surface: "explore",
      slug: item.slug,
    }, "explore");
  }, []);

  if (!items || items.length === 0) {
    if (!emptyMessage) return null;
    return (
      <div className="px-4 py-3">
        <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5">
          <span>{icon}</span> {title}
        </h3>
        <div className="flex items-center justify-center py-8 rounded-2xl bg-muted/10 border border-border/10">
          <p className="text-xs text-muted-foreground">{emptyMessage}</p>
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
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
          <span>{icon}</span> {title}
        </h3>
        <Link
          to={seeAllRoute}
          className="text-2xs font-semibold text-primary flex items-center gap-0.5 active:opacity-70"
        >
          See all <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none px-4 snap-x snap-mandatory">
        {items.map((item) => (
          <UniverseCard
            key={item.id}
            id={item.id}
            title={item.name}
            subtitle={formatSubtitle(item)}
            image={item.banner_url || item.logo_url}
            rating={item.rating}
            distance={formatDistance(item.distanceKm)}
            vertical={item.vertical || undefined}
            onClick={() => handleCardClick(item)}
            className="snap-start"
          />
        ))}
      </div>
    </motion.div>
  );
});
