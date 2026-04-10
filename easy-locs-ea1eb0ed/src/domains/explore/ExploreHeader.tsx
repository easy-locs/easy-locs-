import { memo } from "react";
import { MapPin, SlidersHorizontal } from "lucide-react";
import { motion } from "framer-motion";
import UnifiedSearchBar from "@/components/search/UnifiedSearchBar";

interface ExploreHeaderProps {
  greeting: string;
  locationLabel: string;
  onLocationTap: () => void;
}

export const ExploreHeader = memo(function ExploreHeader({ greeting, locationLabel, onLocationTap }: ExploreHeaderProps) {
  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border/10 pb-3 pt-3 px-4">
      <div className="flex items-center justify-between mb-3">
        <div className="min-w-0 flex-1">
          <motion.p
            className="text-[11px] font-medium text-muted-foreground"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {greeting}
          </motion.p>
          <motion.h1
            className="text-lg font-bold text-foreground leading-tight"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            Explore
          </motion.h1>
        </div>

        <button
          onClick={onLocationTap}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/30 border border-border/15 active:scale-95 transition-transform"
        >
          <MapPin className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-foreground max-w-[120px] truncate">{locationLabel}</span>
        </button>
      </div>

      <UnifiedSearchBar variant="compact" placeholder="Search food, hotels, shops, services, rides..." />
    </div>
  );
});
