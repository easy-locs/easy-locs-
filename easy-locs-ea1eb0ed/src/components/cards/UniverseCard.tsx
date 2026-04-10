/**
 * UniverseCard — Canonical card for shop/entity display across all modules.
 * Supports vertical (carousel) and horizontal (list) layouts.
 * Handles image, title, subtitle, rating, distance, price, badge.
 * Pure visual — no data fetching, no state management.
 */
import { memo } from "react";
import { Star, Navigation } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface UniverseCardProps {
  id?: string;
  title: string;
  subtitle?: string;
  image?: string | null;
  logo?: string | null;
  rating?: number | null;
  distance?: string;
  badge?: string;
  price?: string;
  eta?: string;
  to?: string;
  onClick?: () => void;
  className?: string;
  index?: number;
  variant?: "vertical" | "horizontal";
}

export const UniverseCard = memo(function UniverseCard({
  title,
  subtitle,
  image,
  logo,
  rating,
  distance,
  badge,
  price,
  eta,
  to,
  onClick,
  className: extraClass,
  index = 0,
  variant = "vertical",
}: UniverseCardProps) {
  if (variant === "horizontal") {
    const inner = (
      <div className="flex gap-3 items-center">
        <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-muted/20 shrink-0">
          {image ? (
            <img src={image} alt={title} className="w-full h-full object-cover" loading="lazy" />
          ) : logo ? (
            <img src={logo} alt={title} className="w-full h-full object-contain p-2" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Star className="h-5 w-5 text-muted-foreground/20" />
            </div>
          )}
          {badge && (
            <span className="absolute top-1 left-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-primary text-primary-foreground">{badge}</span>
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-0.5">
          <p className="text-sm font-bold text-foreground line-clamp-1">{title}</p>
          {subtitle && <p className="text-[11px] text-muted-foreground line-clamp-1">{subtitle}</p>}
          <div className="flex items-center gap-2">
            {rating != null && rating > 0 && (
              <span className="text-[11px] text-amber-500 font-semibold shrink-0">★ {Number(rating).toFixed(1)}</span>
            )}
            {eta && <span className="text-[11px] text-muted-foreground shrink-0">{eta}</span>}
            {distance && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-0.5 shrink-0">
                <Navigation className="h-2.5 w-2.5" />{distance}
              </span>
            )}
          </div>
        </div>
        {price && <span className="text-xs font-bold text-foreground shrink-0">{price}</span>}
      </div>
    );

    const cls = cn(
      "block p-3 rounded-2xl border border-border/15 bg-card card-lift shadow-sm",
      extraClass,
    );

    if (to) return <Link to={to} className={cls} data-card-hover>{inner}</Link>;
    return <button type="button" onClick={onClick} className={cn(cls, "text-left w-full")} data-card-hover>{inner}</button>;
  }

  const content = (
    <>
      <div className="relative aspect-[16/10] flex items-center justify-center overflow-hidden rounded-t-2xl bg-muted/20 shrink-0">
        {image ? (
          <img src={image} alt={title} className="w-full h-full object-cover" loading="lazy" />
        ) : logo ? (
          <img src={logo} alt={title} className="h-10 w-10 object-contain" loading="lazy" />
        ) : (
          <Star className="h-6 w-6 text-muted-foreground/20" />
        )}
        {badge && (
          <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-primary text-primary-foreground">{badge}</span>
        )}
      </div>
      <div className="min-w-0 space-y-1 p-3 flex-1 flex flex-col">
        <p className="text-xs font-bold leading-snug text-foreground line-clamp-2 break-words">{title}</p>
        {subtitle && (
          <p className="line-clamp-1 min-w-0 text-[11px] leading-snug text-muted-foreground break-words">{subtitle}</p>
        )}
        <div className="flex items-center gap-2 mt-auto pt-0.5">
          {rating != null && rating > 0 && (
            <span className="text-[11px] text-amber-500 font-semibold shrink-0">★ {Number(rating).toFixed(1)}</span>
          )}
          {distance && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-0.5 shrink-0">
              <Navigation className="h-2.5 w-2.5" />{distance}
            </span>
          )}
          {price && <span className="text-[11px] font-bold text-foreground shrink-0">{price}</span>}
        </div>
      </div>
    </>
  );

  const cls = cn(
    "shrink-0 w-[170px] rounded-2xl border border-border/15 bg-card overflow-hidden card-lift flex flex-col",
    extraClass,
  );

  if (to) return <Link to={to} className={cls} data-card-hover>{content}</Link>;
  return <button type="button" onClick={onClick} className={cn(cls, "text-left")} data-card-hover>{content}</button>;
});

export default UniverseCard;
