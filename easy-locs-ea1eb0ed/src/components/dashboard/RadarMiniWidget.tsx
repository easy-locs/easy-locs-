import { memo, Suspense } from "react";
import { Link } from "react-router-dom";
import { MapPin, ChevronRight, Navigation } from "lucide-react";
import { motion } from "framer-motion";
import WidgetSkeleton from "./WidgetSkeleton";

interface NearbyItem {
  id: string;
  name: string;
  category: string;
  distance: string;
  rating?: number;
}

interface RadarMiniWidgetProps {
  items?: NearbyItem[];
  loading?: boolean;
  userCity?: string;
  className?: string;
}

function RadarMiniWidgetInner({
  items = [],
  loading = false,
  userCity,
  className = "",
}: RadarMiniWidgetProps) {
  if (loading) {
    return <WidgetSkeleton height={160} lines={3} className={className} />;
  }

  const displayItems = items.slice(0, 5);

  return (
    <motion.div
      className={`rounded-2xl border border-border/10 bg-card overflow-hidden ${className}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
    >
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[hsl(var(--brand-primary)/0.12)]">
            <Navigation className="h-4 w-4 text-[hsl(var(--brand-primary))]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Nearby</h3>
            {userCity && (
              <p className="text-[10px] text-foreground/40">{userCity}</p>
            )}
          </div>
        </div>
        <Link
          to="/radar"
          className="flex items-center gap-0.5 text-xs font-medium text-[hsl(var(--brand-primary))] hover:underline"
        >
          Explore <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {displayItems.length > 0 ? (
        <div className="px-4 pb-3 space-y-1.5">
          {displayItems.map((item) => (
            <Link
              key={item.id}
              to={`/radar?focus=${item.id}`}
              className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors group"
            >
              <MapPin className="h-3.5 w-3.5 text-foreground/30 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate group-hover:text-[hsl(var(--brand-primary))]">
                  {item.name}
                </p>
                <p className="text-[10px] text-foreground/40">{item.category}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] text-foreground/40">{item.distance}</span>
                {item.rating != null && (
                  <span className="block text-[10px] text-amber-500">★ {item.rating.toFixed(1)}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="px-4 pb-4 text-center">
          <p className="text-xs text-foreground/40">No nearby places found</p>
        </div>
      )}
    </motion.div>
  );
}

const RadarMiniWidget = memo(RadarMiniWidgetInner);
export default RadarMiniWidget;
