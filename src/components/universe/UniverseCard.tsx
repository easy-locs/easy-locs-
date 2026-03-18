/**
 * UniverseCard — Tappable card used inside universe hubs (e.g. restaurant, store, provider).
 */
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { motion } from "framer-motion";

interface UniverseCardProps {
  to: string;
  image?: string;
  title: string;
  subtitle?: string;
  rating?: number;
  badge?: string;
  price?: string;
  className?: string;
  index?: number;
}

export default function UniverseCard({
  to,
  image,
  title,
  subtitle,
  rating,
  badge,
  price,
  className,
  index = 0,
}: UniverseCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Link
        to={to}
        className={cn(
          "block rounded-2xl border border-border/30 bg-card overflow-hidden active:scale-[0.97] transition-transform",
          className,
        )}
      >
        {/* Image */}
        {image ? (
          <div className="aspect-[16/10] bg-muted overflow-hidden">
            <img src={image} alt={title} className="w-full h-full object-cover" loading="lazy" />
          </div>
        ) : (
          <div className="aspect-[16/10] bg-muted flex items-center justify-center">
            <span className="text-3xl">🏷️</span>
          </div>
        )}

        {/* Info */}
        <div className="p-3 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-bold text-foreground line-clamp-1">{title}</h3>
            {rating != null && (
              <span className="flex items-center gap-0.5 text-xs font-semibold text-primary shrink-0">
                <Star className="h-3 w-3 fill-current" /> {rating.toFixed(1)}
              </span>
            )}
          </div>
          {subtitle && <p className="text-2xs text-muted-foreground line-clamp-1">{subtitle}</p>}
          <div className="flex items-center gap-2">
            {badge && (
              <span className="text-2xs font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                {badge}
              </span>
            )}
            {price && <span className="text-xs font-bold text-foreground ml-auto">{price}</span>}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
