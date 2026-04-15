import { memo } from "react";
import { Link } from "react-router-dom";
import { Star, MapPin, MessageCircle, ShoppingCart, Clock, ChevronRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface RadarEntity {
  id: string;
  name: string;
  type: "restaurant" | "shop" | "service" | "driver" | "c2c" | "hotel";
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
  distance?: string;
  priceRange?: string;
  isOpen?: boolean;
  slug?: string;
  category?: string;
}

interface RadarQuickActionSheetProps {
  entity: RadarEntity | null;
  onClose: () => void;
  onChat?: (entityId: string) => void;
}

function getActionLabel(type: RadarEntity["type"]): string {
  switch (type) {
    case "restaurant":
      return "Order Now";
    case "shop":
      return "Visit Shop";
    case "service":
      return "Book Now";
    case "hotel":
      return "Reserve";
    case "c2c":
      return "View Listing";
    case "driver":
      return "Request Ride";
    default:
      return "View Details";
  }
}

function getActionRoute(entity: RadarEntity): string {
  switch (entity.type) {
    case "restaurant":
    case "shop":
      return `/storefront/${entity.slug || entity.id}`;
    case "service":
      return `/browse/services/${entity.id}`;
    case "hotel":
      return `/stay/${entity.id}`;
    case "c2c":
      return `/annonces/${entity.id}`;
    case "driver":
      return `/taxi?driver=${entity.id}`;
    default:
      return `/browse/${entity.id}`;
  }
}

function RadarQuickActionSheetInner({ entity, onClose, onChat }: RadarQuickActionSheetProps) {
  return (
    <AnimatePresence>
      {entity && (
        <motion.div
          className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+72px)]"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
        >
          <div className="relative overflow-hidden rounded-2xl border border-border/20 bg-card shadow-lg">
            <button
              onClick={onClose}
              className="absolute right-3 top-3 p-1 rounded-full bg-background/60 hover:bg-background/80 transition-colors z-10"
              aria-label="Close"
            >
              <X className="h-4 w-4 text-foreground/60" />
            </button>

            <div className="flex gap-3 p-4">
              {entity.imageUrl ? (
                <img
                  src={entity.imageUrl}
                  alt={entity.name}
                  className="h-20 w-20 rounded-xl object-cover shrink-0"
                  loading="lazy"
                />
              ) : (
                <div className="h-20 w-20 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <MapPin className="h-6 w-6 text-muted-foreground" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base text-foreground truncate">{entity.name}</h3>

                <div className="flex items-center gap-2 mt-1">
                  {entity.rating != null && (
                    <span className="flex items-center gap-0.5 text-xs font-medium text-amber-500">
                      <Star className="h-3 w-3 fill-current" />
                      {entity.rating.toFixed(1)}
                      {entity.reviewCount != null && (
                        <span className="text-foreground/40">({entity.reviewCount})</span>
                      )}
                    </span>
                  )}
                  {entity.distance && (
                    <span className="flex items-center gap-0.5 text-xs text-foreground/50">
                      <MapPin className="h-3 w-3" />
                      {entity.distance}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1">
                  {entity.priceRange && (
                    <span className="text-xs text-foreground/50">{entity.priceRange}</span>
                  )}
                  {entity.isOpen != null && (
                    <span className={`text-xs font-medium ${entity.isOpen ? "text-emerald-500" : "text-red-400"}`}>
                      {entity.isOpen ? "Open" : "Closed"}
                    </span>
                  )}
                  {entity.category && (
                    <span className="text-xs text-foreground/40">{entity.category}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 px-4 pb-4">
              <Link
                to={getActionRoute(entity)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[hsl(var(--brand-primary))] text-white text-sm font-semibold active:scale-[0.97] transition-transform"
              >
                <ShoppingCart className="h-4 w-4" />
                {getActionLabel(entity.type)}
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>

              {onChat && (
                <button
                  onClick={() => onChat(entity.id)}
                  className="flex items-center justify-center p-2.5 rounded-xl border border-border/20 bg-background hover:bg-muted transition-colors"
                  aria-label="Chat with merchant"
                >
                  <MessageCircle className="h-4 w-4 text-foreground/60" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const RadarQuickActionSheet = memo(RadarQuickActionSheetInner);
export default RadarQuickActionSheet;
