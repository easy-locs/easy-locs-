/**
 * MerchantCard — Unified premium card for all marketplace listings.
 * Consistent image ratio, radius, padding, badges.
 */
import { Link } from "react-router-dom";
import { Star, Clock, MapPin } from "lucide-react";
import { motion } from "framer-motion";

interface MerchantCardProps {
  to: string;
  image?: string | null;
  name: string;
  category?: string;
  rating?: number;
  eta?: string;
  distance?: string;
  badge?: string;
  partnerBadge?: boolean;
  index?: number;
  variant?: "horizontal" | "vertical";
}

export default function MerchantCard({
  to, image, name, category, rating, eta, distance,
  badge, partnerBadge, index = 0, variant = "horizontal",
}: MerchantCardProps) {
  const Img = ({ className }: { className: string }) =>
    image ? (
      <img src={image} alt={name} className={`${className} object-cover`} loading="lazy" />
    ) : (
      <div className={`${className} flex items-center justify-center`} style={{ background: "hsl(var(--muted))" }}>
        <span className="text-2xl">🏪</span>
      </div>
    );

  if (variant === "vertical") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04 }}
        data-card="merchant"
      >
        <Link
          to={to}
          className="block rounded-2xl overflow-hidden active:scale-[0.97] transition-transform"
          style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.12)" }}
        >
          <div className="aspect-[16/10] relative overflow-hidden">
            <Img className="w-full h-full" />
            {badge && (
              <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm"
                style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
                {badge}
              </span>
            )}
            {partnerBadge && (
              <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }}>
                Partner
              </span>
            )}
          </div>
          <div className="p-3 space-y-1">
            <h3 className="text-sm font-bold text-foreground line-clamp-2 break-words">{name}</h3>
            {category && <p className="text-[11px] text-muted-foreground line-clamp-1 break-words">{category}</p>}
            <div className="flex items-center gap-3 pt-0.5">
              {rating != null && (
                <span className="flex items-center gap-1 text-[11px] font-semibold">
                  <Star className="h-3 w-3 fill-current" style={{ color: "hsl(45 90% 50%)" }} /> {rating.toFixed(1)}
                </span>
              )}
              {eta && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" /> {eta}
                </span>
              )}
              {distance && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {distance}
                </span>
              )}
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }

  // Horizontal (list)
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      data-card="merchant"
    >
      <Link
        to={to}
        className="flex gap-3 p-3 rounded-2xl active:scale-[0.98] transition-transform"
        style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.12)" }}
      >
        <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 relative">
          <Img className="w-full h-full" />
          {badge && (
            <span className="absolute bottom-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
              {badge}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
          <h3 className="text-sm font-bold text-foreground line-clamp-2 break-words">{name}</h3>
          {category && <p className="text-[11px] text-muted-foreground line-clamp-1 break-words">{category}</p>}
          <div className="flex items-center gap-3 mt-0.5">
            {rating != null && (
              <span className="flex items-center gap-1 text-[11px] font-semibold">
                <Star className="h-3 w-3 fill-current" style={{ color: "hsl(45 90% 50%)" }} /> {rating.toFixed(1)}
              </span>
            )}
            {eta && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" /> {eta}
              </span>
            )}
            {distance && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <MapPin className="h-3 w-3" /> {distance}
              </span>
            )}
          </div>
        </div>
        {partnerBadge && (
          <div className="flex items-center shrink-0">
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: "hsl(var(--accent) / 0.15)", color: "hsl(var(--accent))" }}>
              ★
            </span>
          </div>
        )}
      </Link>
    </motion.div>
  );
}
