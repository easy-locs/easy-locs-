import { memo, useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Star, MapPin, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUnifiedPayment } from "@/payments/UnifiedPaymentSystem";
import { executeUniversalAction } from "@/lib/action-engine";

export interface StayCardProps {
  id: string;
  slug: string;
  name: string;
  area: string;
  image: string;
  stars: number;
  rating: number;
  reviewsCount: number;
  distanceKm?: number;
  pricePerNight: number;
  currency?: string;
  amenities?: string[];
  freeCancellation?: boolean;
}

const GOLD = "hsl(38 65% 56%)";
const NAVY = "hsl(220 40% 18%)";

const StayCard = memo(function StayCard({
  slug,
  name,
  area,
  image,
  stars,
  rating,
  reviewsCount,
  distanceKm,
  pricePerNight,
  currency = "AED",
  freeCancellation,
}: StayCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openPayment } = useUnifiedPayment();
  const [busy, setBusy] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleBook = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    await executeUniversalAction(
      { entityType: "stay", action: "open", slug, title: name },
      { navigate, openPayment, currentUserId: user?.id },
    );
    setBusy(false);
  }, [slug, name, navigate, openPayment, user?.id]);

  return (
    <Link
      to={`/stay/${slug}`}
      className="group block rounded-2xl overflow-hidden transition-all duration-300 active:scale-[0.98]"
      style={{
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border) / 0.12)",
        boxShadow: "0 1px 3px hsl(var(--foreground) / 0.04), 0 4px 12px hsl(var(--foreground) / 0.03)",
      }}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {!imgLoaded && !imgError && (
          <div className="absolute inset-0 animate-pulse bg-muted" />
        )}
        {!imgError && (
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            style={{ opacity: imgLoaded ? 1 : 0 }}
          />
        )}
        {imgError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl">🏨</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-24" style={{ background: "linear-gradient(transparent, hsl(0 0% 0% / 0.5))" }} />

        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold backdrop-blur-md"
            style={{ background: "hsl(0 0% 0% / 0.5)", color: "white" }}>
            <Star className="h-3 w-3" style={{ fill: GOLD, color: GOLD }} />
            {rating.toFixed(1)}
            <span className="text-white/60 font-normal text-[10px]">({reviewsCount})</span>
          </span>
        </div>

        {freeCancellation && (
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[10px] font-bold backdrop-blur-md"
            style={{ background: "hsl(142 60% 45% / 0.9)", color: "white" }}>
            Free cancel
          </div>
        )}

        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: stars }).map((_, i) => (
              <Star key={i} className="h-3 w-3" style={{ fill: GOLD, color: GOLD }} />
            ))}
          </div>
          <div className="text-right">
            <span className="text-lg font-black text-white drop-shadow-md">
              {currency} {pricePerNight.toLocaleString()}
            </span>
            <span className="text-xs text-white/70 ml-1">/night</span>
          </div>
        </div>
      </div>

      <div className="p-3.5 space-y-2">
        <h3 className="text-sm font-bold leading-snug line-clamp-2 text-foreground group-hover:text-[hsl(38_65%_56%)] transition-colors">
          {name}
        </h3>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: GOLD }} />
          <span className="line-clamp-1">{area}</span>
          {distanceKm != null && (
            <span className="shrink-0 ml-1 font-medium">
              · {distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`}
            </span>
          )}
        </div>

        <div className="flex items-center justify-end pt-0.5">
          <Button
            type="button"
            size="sm"
            className="h-9 px-4 rounded-xl text-[11px] font-bold gap-1.5"
            style={{ background: GOLD, color: NAVY }}
            onClick={handleBook}
            disabled={busy}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
            Book
          </Button>
        </div>
      </div>
    </Link>
  );
});

export default StayCard;
