/**
 * PremiumMerchantCard — Enhanced card with vertical-aware styling.
 * Consumes the Canonical UI Engine for per-vertical card behavior.
 * Supports: horizontal (list), vertical (carousel), and featured (large hero card).
 */
import { Link } from "react-router-dom";
import { Star, Clock, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { resolveCanonicalUI } from "@/lib/ui-engine";

interface PremiumMerchantCardProps {
  to: string;
  image?: string | null;
  name: string;
  category?: string;
  rating?: number;
  reviewCount?: number;
  eta?: string;
  distance?: string;
  badge?: string;
  priceRange?: string;
  isOpen?: boolean;
  isSponsored?: boolean;
  index?: number;
  variant?: "horizontal" | "vertical" | "featured";
  verticalType?: string;
}

const FALLBACK_EMOJIS: Record<string, string> = {
  food: "🍽️", grocery: "🛒", shops: "🛍️", services: "🛠️",
  property: "🏠", healthcare: "🏥", mobility: "🚗", experiences: "🎉",
};

export default function PremiumMerchantCard({
  to, image, name, category, rating, reviewCount, eta, distance,
  badge, priceRange, isOpen, isSponsored, index = 0, variant = "horizontal",
  verticalType = "food",
}: PremiumMerchantCardProps) {
  const [imgError, setImgError] = useState(false);
  const ui = useMemo(() => resolveCanonicalUI(verticalType), [verticalType]);

  const fallback = FALLBACK_EMOJIS[verticalType] || "🏪";

  const Img = ({ className }: { className: string }) =>
    image && !imgError ? (
      <img
        src={image}
        alt={name}
        className={`${className} object-cover`}
        loading="lazy"
        onError={() => setImgError(true)}
      />
    ) : (
      <div className={`${className} flex items-center justify-center`} style={{ background: "hsl(var(--muted))" }}>
        <span className="text-3xl">{fallback}</span>
      </div>
    );

  const RatingBadge = () => (
    rating != null && rating > 0 ? (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded-lg"
        style={{ background: "hsl(45 90% 50% / 0.15)", color: "hsl(45 80% 40%)" }}>
        <Star className="h-3 w-3 fill-current" style={{ color: "hsl(45 90% 50%)" }} />
        {rating.toFixed(1)}
        {reviewCount != null && reviewCount > 0 && (
          <span className="text-[10px] font-normal opacity-70">({reviewCount})</span>
        )}
      </span>
    ) : null
  );

  const StatusDot = () => (
    isOpen != null ? (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold"
        style={{ color: isOpen ? "hsl(var(--success))" : "hsl(var(--destructive))" }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{
          background: isOpen ? "hsl(var(--success))" : "hsl(var(--destructive))"
        }} />
        {isOpen ? "Open" : "Closed"}
      </span>
    ) : null
  );

  // ── FEATURED variant (hero card) ──
  if (variant === "featured") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.06 }}
      >
        <Link
          to={to}
          className="block rounded-2xl overflow-hidden active:scale-[0.97] transition-transform shadow-md"
          style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.08)" }}
        >
          <div className="aspect-[16/9] relative overflow-hidden">
            <Img className="w-full h-full" />
            <div className="absolute inset-0" style={{
              background: "linear-gradient(to top, hsla(0,0%,0%,0.6) 0%, transparent 50%)"
            }} />
            {badge && (
              <span className="absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg backdrop-blur-sm"
                style={{ background: "hsl(var(--primary) / 0.9)", color: "hsl(var(--primary-foreground))" }}>
                {badge}
              </span>
            )}
            {isSponsored && (
              <span className="absolute top-3 right-3 text-[9px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "hsl(var(--accent) / 0.9)", color: "hsl(var(--accent-foreground))" }}>
                Sponsored
              </span>
            )}
            <div className="absolute bottom-3 left-3 right-3">
              <h3 className="text-lg font-black text-white line-clamp-2 leading-tight drop-shadow-md">{name}</h3>
              {category && <p className="text-xs text-white/80 line-clamp-2 leading-snug mt-0.5">{category}</p>}
            </div>
          </div>
          <div className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <RatingBadge />
              <StatusDot />
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              {eta && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{eta}</span>}
              {distance && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{distance}</span>}
              {priceRange && <span className="font-semibold">{priceRange}</span>}
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }

  // ── VERTICAL variant (carousel) ──
  if (variant === "vertical") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04 }}
      >
        <Link
          to={to}
          className="block rounded-2xl overflow-hidden active:scale-[0.97] transition-transform"
          style={{ background: "hsl(var(--card))", boxShadow: "var(--shadow-card)" }}
        >
          <div className="aspect-[4/3] relative overflow-hidden">
            <Img className="w-full h-full" />
            {badge && (
              <span className="absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm"
                style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
                {badge}
              </span>
            )}
          </div>
          <div className="p-2.5 space-y-1">
            <h3 className="text-[13px] font-bold text-foreground line-clamp-2 leading-snug">{name}</h3>
            {category && <p className="text-[10px] text-muted-foreground line-clamp-1 leading-snug">{category}</p>}
            <div className="flex items-center gap-2 pt-0.5">
              <RatingBadge />
              {distance && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <MapPin className="h-2.5 w-2.5" /> {distance}
                </span>
              )}
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }

  // ── HORIZONTAL variant (list) ──
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Link
        to={to}
        className="flex gap-3 p-3 rounded-2xl active:scale-[0.98] transition-transform"
        style={{ background: "hsl(var(--card))", boxShadow: "var(--shadow-card)" }}
      >
        <div className="w-[88px] h-[88px] rounded-xl overflow-hidden shrink-0 relative">
          <Img className="w-full h-full" />
          {badge && (
            <span className="absolute bottom-1.5 left-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded-md"
              style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
              {badge}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[13px] font-bold text-foreground line-clamp-2 leading-snug flex-1">{name}</h3>
            {isSponsored && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
                style={{ background: "hsl(var(--accent) / 0.12)", color: "hsl(var(--accent))" }}>
                AD
              </span>
            )}
          </div>
          {category && <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">{category}</p>}
          <div className="flex items-center gap-2 flex-wrap">
            <RatingBadge />
            <StatusDot />
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            {eta && <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{eta}</span>}
            {distance && <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{distance}</span>}
            {priceRange && <span className="font-semibold text-foreground">{priceRange}</span>}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
