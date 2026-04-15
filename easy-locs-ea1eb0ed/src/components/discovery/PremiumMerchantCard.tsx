import { Link } from "react-router-dom";
import { Star, Clock, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

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
  stay: "🏨", nightlife: "🍸",
};

export default function PremiumMerchantCard({
  to, image, name, category, rating, reviewCount, eta, distance,
  badge, priceRange, isOpen, isSponsored, index = 0, variant = "horizontal",
  verticalType = "food",
}: PremiumMerchantCardProps) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
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
      <div className={`${className} flex items-center justify-center bg-gradient-to-br from-muted/40 to-muted/15`}>
        <span className="text-3xl">{fallback}</span>
      </div>
    );

  const RatingBadge = () =>
    rating != null && rating > 0 ? (
      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg bg-accent/10 text-accent">
        <Star className="h-3 w-3 fill-current text-accent" />
        {rating.toFixed(1)}
        {reviewCount != null && reviewCount > 0 && (
          <span className="text-xs font-normal opacity-60">({reviewCount})</span>
        )}
      </span>
    ) : null;

  const StatusDot = () =>
    isOpen != null ? (
      <span className={`inline-flex items-center gap-1 text-2xs font-semibold ${isOpen ? "text-success" : "text-destructive"}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? "bg-success" : "bg-destructive"}`} />
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
          className="block rounded-2xl overflow-hidden active:scale-[0.98] transition-transform border border-border/10 bg-card shadow-card-hover"
        >
          <div className="aspect-[16/9] relative overflow-hidden">
            <Img className="w-full h-full" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
            {badge && (
              <span className="absolute top-3 left-3 text-2xs font-bold px-3 py-1 rounded-lg shadow-lg backdrop-blur-md bg-accent text-accent-foreground">
                {badge}
              </span>
            )}
            {isSponsored && (
              <span className="absolute top-3 right-3 text-2xs font-bold px-2.5 py-1 rounded-lg backdrop-blur-md bg-navy/70 text-white">
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
          className="group flex flex-col h-full rounded-2xl overflow-hidden active:scale-[0.98] transition-all duration-300 border border-border/10 bg-card shadow-card"
        >
          <div className="aspect-[16/10] relative overflow-hidden shrink-0">
            <Img className="w-full h-full" />
            {badge && (
              <span className="absolute top-2.5 left-2.5 text-2xs font-bold px-2.5 py-0.5 rounded-lg shadow-sm backdrop-blur-md bg-accent text-accent-foreground">
                {badge}
              </span>
            )}
          </div>
          <div className="p-3 flex-1 flex flex-col gap-1">
            <h3 className="text-xs font-bold text-foreground line-clamp-2 leading-snug group-hover:text-accent transition-colors">{name}</h3>
            {category && <p className="text-xs text-muted-foreground line-clamp-1 leading-snug break-words">{category}</p>}
            <div className="flex items-center gap-2 mt-auto pt-0.5">
              <RatingBadge />
              {distance && (
                <span className="text-xs text-muted-foreground flex items-center gap-0.5 shrink-0">
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
        className="group flex gap-3 p-3 rounded-2xl active:scale-[0.98] transition-all duration-300 border border-border/10 bg-card shadow-card"
      >
        <div className="w-[88px] h-[88px] rounded-xl overflow-hidden shrink-0 relative">
          <Img className="w-full h-full" />
          {badge && (
            <span className="absolute bottom-1.5 left-1.5 text-2xs font-bold px-1.5 py-0.5 rounded-md backdrop-blur-md bg-accent text-accent-foreground">
              {badge}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-bold text-foreground line-clamp-2 leading-snug flex-1 min-w-0 group-hover:text-accent transition-colors">{name}</h3>
            {isSponsored && (
              <span className="text-2xs font-bold px-1.5 py-0.5 rounded-md shrink-0 bg-accent/10 text-accent">
                AD
              </span>
            )}
          </div>
          {category && <p className="text-xs text-muted-foreground line-clamp-2 leading-snug break-words">{category}</p>}
          <div className="flex items-center gap-2 flex-wrap">
            <RatingBadge />
            <StatusDot />
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {eta && <span className="flex items-center gap-1 shrink-0"><Clock className="h-3 w-3" />{eta}</span>}
            {distance && <span className="flex items-center gap-1 shrink-0"><MapPin className="h-3 w-3" />{distance}</span>}
            {priceRange && <span className="font-bold text-foreground shrink-0">{priceRange}</span>}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
