import { Link } from "react-router-dom";
import { Star, Clock, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

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

const GOLD = "hsl(38 65% 56%)";
const NAVY = "hsl(220 40% 18%)";

export default function MerchantCard({
  to, image, name, category, rating, eta, distance,
  badge, partnerBadge, index = 0, variant = "horizontal",
}: MerchantCardProps) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

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
          className="group block rounded-2xl overflow-hidden active:scale-[0.98] transition-all duration-300"
          style={{
            border: "1px solid hsl(var(--border) / 0.12)",
            background: "hsl(var(--card))",
            boxShadow: "0 1px 3px hsl(var(--foreground) / 0.04), 0 4px 12px hsl(var(--foreground) / 0.03)",
          }}
        >
          <div className="aspect-[16/10] relative overflow-hidden">
            <Img className="w-full h-full" />
            {badge && (
              <span className="absolute top-2.5 left-2.5 text-[10px] font-bold px-2.5 py-0.5 rounded-lg shadow-sm backdrop-blur-md"
                style={{ background: GOLD, color: NAVY }}>
                {badge}
              </span>
            )}
            {partnerBadge && (
              <span className="absolute top-2.5 right-2.5 text-[10px] font-bold px-2.5 py-0.5 rounded-lg backdrop-blur-md"
                style={{ background: "hsl(220 40% 18% / 0.7)", color: "white" }}>
                Partner
              </span>
            )}
          </div>
          <div className="p-3 space-y-1.5">
            <h3 className="text-[13px] font-bold text-foreground line-clamp-2 break-words group-hover:text-[hsl(38_65%_56%)] transition-colors">{name}</h3>
            {category && <p className="text-[11px] text-muted-foreground line-clamp-1 break-words">{category}</p>}
            <div className="flex items-center gap-3 pt-0.5">
              {rating != null && (
                <span className="flex items-center gap-1 text-[11px] font-bold">
                  <Star className="h-3 w-3 fill-current" style={{ color: GOLD }} /> {rating.toFixed(1)}
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      data-card="merchant"
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
        <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 relative">
          <Img className="w-full h-full" />
          {badge && (
            <span className="absolute bottom-1 left-1 text-[10px] font-bold px-1.5 py-0.5 rounded-lg backdrop-blur-md"
              style={{ background: GOLD, color: NAVY }}>
              {badge}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
          <h3 className="text-sm font-bold text-foreground line-clamp-2 break-words group-hover:text-[hsl(38_65%_56%)] transition-colors">{name}</h3>
          {category && <p className="text-[11px] text-muted-foreground line-clamp-1 break-words">{category}</p>}
          <div className="flex items-center gap-3 mt-0.5">
            {rating != null && (
              <span className="flex items-center gap-1 text-[11px] font-bold">
                <Star className="h-3 w-3 fill-current" style={{ color: GOLD }} /> {rating.toFixed(1)}
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
            <span className="text-[10px] font-bold px-2 py-1 rounded-lg"
              style={{ background: "hsl(38 65% 56% / 0.12)", color: GOLD }}>
              ★
            </span>
          </div>
        )}
      </Link>
    </motion.div>
  );
}
