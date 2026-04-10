/**
 * UniverseCard — Premium visual card for shop/entity display.
 * Handles image, title, subtitle, rating, distance.
 * Pure visual — no data fetching, no state management.
 */
import { memo } from "react";
import { Star, Navigation } from "lucide-react";
import { Link } from "react-router-dom";

interface UniverseCardProps {
  id: string;
  title: string;
  subtitle?: string;
  image?: string | null;
  logo?: string | null;
  rating?: number | null;
  distance?: string;
  to?: string;
  onClick?: () => void;
}

export const UniverseCard = memo(function UniverseCard({
  id,
  title,
  subtitle,
  image,
  logo,
  rating,
  distance,
  to,
  onClick,
}: UniverseCardProps) {
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
        </div>
      </div>
    </>
  );

  const className = "shrink-0 w-[170px] rounded-2xl border border-border/15 bg-card overflow-hidden active:scale-[0.97] transition-transform flex flex-col";

  if (to) {
    return <Link to={to} className={className}>{content}</Link>;
  }

  return (
    <button type="button" onClick={onClick} className={`${className} text-left`}>
      {content}
    </button>
  );
});
