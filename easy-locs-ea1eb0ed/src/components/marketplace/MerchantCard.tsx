import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Star, Clock, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";

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

const GOLD = "hsl(var(--accent))";
const NAVY = "hsl(226 24% 14%)";
const CARD_SHADOW = "0 1px 4px hsl(var(--foreground) / 0.04), 0 4px 12px hsl(var(--foreground) / 0.03)";

export default function MerchantCard({
  to, image, name, category, rating, eta, distance,
  badge, partnerBadge, index = 0, variant = "horizontal",
}: MerchantCardProps) {
  const { t } = useI18n();
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const Img = ({ className }: { className: string }) =>
    image && !imgError ? (
      <div className={`${className} relative`}>
        {!imgLoaded && <div className="absolute inset-0 animate-pulse" style={{ background: "hsl(var(--muted))" }} />}
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
            boxShadow: CARD_SHADOW,
          }}
        >
          <div className="aspect-[16/10] relative overflow-hidden">
            <Img className="w-full h-full" />
            {badge && (
              <span className="absolute top-2.5 left-2.5 text-[0.625rem] font-bold px-2.5 py-0.5 rounded-lg shadow-sm backdrop-blur-md"
                style={{ background: GOLD, color: NAVY }}>
                {badge}
              </span>
            )}
            {partnerBadge && (
              <span className="absolute top-2.5 right-2.5 text-[0.625rem] font-bold px-2.5 py-0.5 rounded-lg backdrop-blur-md"
                style={{ background: "hsl(226 24% 14% / 0.7)", color: "white" }}>
                {t("mp.partner") || "Partner"}
              </span>
            )}
          </div>
          <div className="p-3 space-y-1 min-w-0">
            <h3 className="text-sm font-bold leading-snug line-clamp-2 break-words transition-colors min-w-0" style={{ color: "hsl(var(--foreground))", textWrap: "balance" } as React.CSSProperties}>{name}</h3>
            {category && <p className="text-xs leading-snug line-clamp-3 break-words min-w-0" style={{ color: "hsl(var(--muted-foreground))" }}>{category}</p>}
            <div className="flex items-center gap-2 flex-wrap pt-0.5">
              {rating != null && (
                <span className="flex items-center gap-1 text-xs font-bold">
                  <Star className="h-3 w-3 fill-current" style={{ color: GOLD }} /> {rating.toFixed(1)}
                </span>
              )}
              {eta && (
                <span className="flex items-center gap-1 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                  <Clock className="h-3 w-3" /> {eta}
                </span>
              )}
              {distance && (
                <span className="flex items-center gap-1 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
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
          boxShadow: CARD_SHADOW,
        }}
      >
        <div className="w-[88px] h-[88px] rounded-xl overflow-hidden shrink-0 relative">
          <Img className="w-full h-full" />
          {badge && (
            <span className="absolute bottom-1 left-1 text-[0.625rem] font-bold px-1.5 py-0.5 rounded-lg backdrop-blur-md"
              style={{ background: GOLD, color: NAVY }}>
              {badge}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
          <h3 className="text-sm font-bold leading-snug line-clamp-2 break-words transition-colors min-w-0"
            style={{ color: "hsl(var(--foreground))", textWrap: "balance" } as React.CSSProperties}>{name}</h3>
          {category && <p className="text-xs line-clamp-2 break-words leading-snug min-w-0" style={{ color: "hsl(var(--muted-foreground))" }}>{category}</p>}
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            {rating != null && (
              <span className="flex items-center gap-1 text-xs font-bold">
                <Star className="h-3 w-3 fill-current" style={{ color: GOLD }} /> {rating.toFixed(1)}
              </span>
            )}
            {eta && (
              <span className="flex items-center gap-1 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                <Clock className="h-3 w-3" /> {eta}
              </span>
            )}
            {distance && (
              <span className="flex items-center gap-1 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                <MapPin className="h-3 w-3" /> {distance}
              </span>
            )}
          </div>
        </div>
        {partnerBadge && (
          <div className="flex items-center shrink-0">
            <span className="text-[0.625rem] font-bold px-2 py-1 rounded-lg"
              style={{ background: "hsl(var(--accent) / 0.12)", color: GOLD }}>
              ★
            </span>
          </div>
        )}
      </Link>
    </motion.div>
  );
}
