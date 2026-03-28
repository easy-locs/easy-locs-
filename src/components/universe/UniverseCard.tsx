/**
 * UniverseCard — Premium tappable card for universe hubs.
 * Supports horizontal (list) and vertical (grid) layouts.
 */
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Star, Clock, MapPin } from "lucide-react";
import { motion } from "framer-motion";

interface UniverseCardProps {
  to: string;
  image?: string;
  title: string;
  subtitle?: string;
  rating?: number;
  badge?: string;
  price?: string;
  eta?: string;
  distance?: string;
  className?: string;
  index?: number;
  variant?: "vertical" | "horizontal";
}

export default function UniverseCard({
  to,
  image,
  title,
  subtitle,
  rating,
  badge,
  price,
  eta,
  distance,
  className,
  index = 0,
  variant = "horizontal",
}: UniverseCardProps) {
  if (variant === "vertical") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04 }}
      >
        <Link
          to={to}
          className={cn(
            "block rounded-2xl border border-border/30 bg-card overflow-hidden active:scale-[0.97] transition-transform shadow-sm",
            className,
          )}
        >
          <div className="aspect-[16/10] bg-muted overflow-hidden relative">
            {image ? (
              <img src={image} alt={title} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <span className="text-3xl opacity-40">🏷️</span>
              </div>
            )}
            {badge && (
              <span className="absolute top-2 left-2 text-2xs font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground shadow-sm">
                {badge}
              </span>
            )}
          </div>
          <div className="p-3 space-y-1">
             <h3 className="text-sm font-bold text-foreground line-clamp-2 break-words leading-snug">{title}</h3>
             {subtitle && <p className="text-2xs text-muted-foreground line-clamp-2 break-words leading-snug">{subtitle}</p>}
            <div className="flex items-center gap-2 pt-0.5">
              {rating != null && (
                <span className="flex items-center gap-0.5 text-2xs font-semibold text-accent">
                  <Star className="h-3 w-3 fill-current" /> {rating.toFixed(1)}
                </span>
              )}
              {price && <span className="text-xs font-bold text-foreground ml-auto">{price}</span>}
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }

  // Horizontal (default — list item)
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Link
        to={to}
        className={cn(
          "flex gap-3 p-2.5 rounded-2xl border border-border/20 bg-card active:scale-[0.98] transition-transform shadow-sm",
          className,
        )}
      >
        {/* Thumbnail */}
        <div className="w-20 h-20 rounded-xl bg-muted overflow-hidden shrink-0 relative">
          {image ? (
            <img src={image} alt={title} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-2xl opacity-40">🏷️</span>
            </div>
          )}
          {badge && (
            <span className="absolute bottom-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
              {badge}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
           <h3 className="text-sm font-bold text-foreground line-clamp-2 break-words leading-snug">{title}</h3>
           {subtitle && <p className="text-2xs text-muted-foreground line-clamp-2 break-words leading-snug">{subtitle}</p>}
          <div className="flex items-center gap-3 mt-0.5">
            {rating != null && (
              <span className="flex items-center gap-0.5 text-2xs font-semibold text-accent">
                <Star className="h-2.5 w-2.5 fill-current" /> {rating.toFixed(1)}
              </span>
            )}
            {eta && (
              <span className="flex items-center gap-0.5 text-2xs text-muted-foreground">
                <Clock className="h-2.5 w-2.5" /> {eta}
              </span>
            )}
            {distance && (
              <span className="flex items-center gap-0.5 text-2xs text-muted-foreground">
                <MapPin className="h-2.5 w-2.5" /> {distance}
              </span>
            )}
          </div>
        </div>

        {/* Price */}
        {price && (
          <div className="flex items-center shrink-0">
            <span className="text-xs font-bold text-foreground">{price}</span>
          </div>
        )}
      </Link>
    </motion.div>
  );
}
