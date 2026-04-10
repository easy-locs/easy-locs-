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

const GOLD = "hsl(38 65% 56%)";
const NAVY = "hsl(220 40% 18%)";

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
  const [imgLoaded, setImgLoaded] = useState(false);
  const ui = useMemo(() => resolveCanonicalUI(verticalType), [verticalType]);
  const fallback = FALLBACK_EMOJIS[verticalType] || "🏪";

  const Img = ({ className }: { className: string }) =>
    image && !imgError ? (
      <div className={`${className} relative`}>
        {!imgLoaded && <div className="absolute inset-0 animate-pulse bg-muted" />}
        <img
          src={image}
          alt={name}
          className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
        />
      </div>
    ) : (
      <div className={`${className} flex items-center justify-center`} style={{ background: "hsl(var(--muted))" }}>
        <span className="text-3xl">{fallback}</span>
      </div>
    );

  const RatingBadge = () =>
    rating != null && rating > 0 ? (
      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg"
        style={{ background: "hsl(38 65% 56% / 0.12)", color: GOLD }}>
        <Star className="h-3 w-3 fill-current" style={{ color: GOLD }} />
        {rating.toFixed(1)}
        {reviewCount != null && reviewCount > 0 && (
          <span className="text-[11px] font-normal opacity-60">({reviewCount})</span>
        )}
      </span>
    ) : null;

  const StatusDot = () =>
    isOpen != null ? (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold"
        style={{ color: isOpen ? "hsl(142 60% 45%)" : "hsl(var(--destructive))" }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{
          background: isOpen ? "hsl(142 60% 45%)" : "hsl(var(--destructive))"
        }} />
        {isOpen ? "Open" : "Closed"}
      </span>
    ) : null;

  if (variant === "featured") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.06 }}
      >
        <Link
          to={to}
          className="block rounded-2xl overflow-hidden active:scale-[0.98] transition-transform"
          style={{
            boxShadow: "0 2px 8px hsl(var(--foreground) / 0.06), 0 8px 24px hsl(var(--foreground) / 0.04)",
            border: "1px solid hsl(var(--border) / 0.12)",
            background: "hsl(var(--card))",
          }}
        >
          <div className="aspect-[16/9] relative overflow-hidden">
            <Img className="w-full h-full" />
            <div className="absolute inset-0" style={{
              background: "linear-gradient(to top, hsl(0 0% 0% / 0.65) 0%, transparent 55%)"
            }} />
            {badge && (
              <span className="absolute top-3 left-3 text-[10px] font-bold px-3 py-1 rounded-lg shadow-lg backdrop-blur-md"
                style={{ background: GOLD, color: NAVY }}>
                {badge}
              </span>
            )}
            {isSponsored && (
              <span className="absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-md"
                style={{ background: "hsl(220 40% 18% / 0.7)", color: "white" }}>
                Sponsored
              </span>
            )}
            <div className="absolute bottom-3 left-3 right-3">
              <h3 className="text-lg font-bold text-white line-clamp-2 leading-tight break-words drop-shadow-md">{name}</h3>
              {category && <p className="text-xs text-white/80 line-clamp-2 leading-snug break-words mt-1">{category}</p>}
            </div>
          </div>
          <div className="p-3.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2.5">
              <RatingBadge />
              <StatusDot />
            </div>
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {eta && <span className="flex items-center gap-1 shrink-0"><Clock className="h-3 w-3" />{eta}</span>}
              {distance && <span className="flex items-center gap-1 shrink-0"><MapPin className="h-3 w-3" />{distance}</span>}
              {priceRange && <span className="font-bold text-foreground shrink-0">{priceRange}</span>}
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }

  if (variant === "vertical") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04 }}
        className="h-full"
      >
        <Link
          to={to}
          className="group flex flex-col h-full rounded-2xl overflow-hidden active:scale-[0.98] transition-all duration-300"
          style={{
            border: "1px solid hsl(var(--border) / 0.12)",
            background: "hsl(var(--card))",
            boxShadow: "0 1px 3px hsl(var(--foreground) / 0.04), 0 4px 12px hsl(var(--foreground) / 0.03)",
          }}
        >
          <div className="aspect-[3/2] relative overflow-hidden shrink-0">
            <Img className="w-full h-full" />
            {badge && (
              <span className="absolute top-2.5 left-2.5 text-[10px] font-bold px-2.5 py-0.5 rounded-lg shadow-sm backdrop-blur-md"
                style={{ background: GOLD, color: NAVY }}>
                {badge}
              </span>
            )}
          </div>
          <div className="p-3 flex-1 flex flex-col gap-1">
            <h3 className="text-xs font-bold text-foreground line-clamp-2 leading-snug group-hover:text-[hsl(38_65%_56%)] transition-colors">{name}</h3>
            {category && <p className="text-[11px] text-muted-foreground line-clamp-1 leading-snug break-words">{category}</p>}
            <div className="flex items-center gap-2 mt-auto pt-0.5">
              <RatingBadge />
              {distance && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-0.5 shrink-0">
                  <MapPin className="h-3 w-3" /> {distance}
                </span>
              )}
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Link
        to={to}
        className="group flex gap-3 p-3 rounded-2xl active:scale-[0.98] transition-all duration-300"
        style={{
          border: "1px solid hsl(var(--border) / 0.12)",
          background: "hsl(var(--card))",
          boxShadow: "0 1px 3px hsl(var(--foreground) / 0.04), 0 4px 12px hsl(var(--foreground) / 0.03)",
        }}
      >
        <div className="w-[88px] h-[88px] rounded-xl overflow-hidden shrink-0 relative">
          <Img className="w-full h-full" />
          {badge && (
            <span className="absolute bottom-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-md"
              style={{ background: GOLD, color: NAVY }}>
              {badge}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-bold text-foreground line-clamp-2 leading-snug flex-1 min-w-0 group-hover:text-[hsl(38_65%_56%)] transition-colors">{name}</h3>
            {isSponsored && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
                style={{ background: "hsl(38 65% 56% / 0.12)", color: GOLD }}>
                AD
              </span>
            )}
          </div>
          {category && <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug break-words">{category}</p>}
          <div className="flex items-center gap-2 flex-wrap">
            <RatingBadge />
            <StatusDot />
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
            {eta && <span className="flex items-center gap-1 shrink-0"><Clock className="h-3 w-3" />{eta}</span>}
            {distance && <span className="flex items-center gap-1 shrink-0"><MapPin className="h-3 w-3" />{distance}</span>}
            {priceRange && <span className="font-bold text-foreground shrink-0">{priceRange}</span>}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
