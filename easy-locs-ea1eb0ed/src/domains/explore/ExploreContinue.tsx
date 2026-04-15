import { memo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { platformBus } from "@/lib/shared/platform-bus";
import type { ContinueItem } from "./explore.view-model";

interface ExploreContinueProps {
  items: ContinueItem[];
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
};

export const ExploreContinue = memo(function ExploreContinue({ items }: ExploreContinueProps) {
  const navigate = useNavigate();

  const handleContinue = useCallback((item: ContinueItem) => {
    if (item.id && item.vertical) {
      const entityType = VERTICAL_TO_ENTITY_TYPE[item.vertical] ?? "merchant";
      platformBus.emit("explore:entity_clicked", {
        entityId: item.id,
        entityType,
        vertical: item.vertical,
        surface: "explore",
      }, "explore");
    } else {
      platformBus.emit("explore:continue_clicked", {
        entityId: item.id,
        vertical: item.vertical,
        route: item.route,
        surface: "explore",
      }, "explore");
      navigate(item.route);
    }
  }, [navigate]);

  if (items.length === 0) return null;

  return (
    <div className="px-4 py-3">
      <h3 className="text-sm font-bold text-foreground mb-2.5 flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5 text-primary" /> Continue
      </h3>
      <div className="space-y-2">
        {items.map((item, i) => (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => handleContinue(item)}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/15 border border-border/10 active:scale-[0.98] transition-all text-left"
          >
            {item.image && (
              <img
                src={item.image}
                alt={item.title}
                className="h-10 w-10 rounded-lg object-cover shrink-0"
                loading="lazy"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-foreground line-clamp-1">{item.title}</p>
              <p className="text-2xs text-muted-foreground line-clamp-1">{item.subtitle}</p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          </motion.button>
        ))}
      </div>
    </div>
  );
});
