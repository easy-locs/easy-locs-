import { memo, useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Star, MapPin, MessageCircle, Loader2 } from "lucide-react";
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
      className="group block rounded-2xl overflow-hidden transition-all duration-200 active:scale-[0.97] border border-border/15 bg-card shadow-sm"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold"
          style={{ background: "hsla(0,0%,0%,0.55)", backdropFilter: "blur(8px)", color: "white" }}>
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
          {rating.toFixed(1)}
          <span className="text-white/60 font-normal">({reviewsCount})</span>
        </div>
        {freeCancellation && (
          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md text-[10px] font-semibold"
            style={{ background: "hsla(142,60%,45%,0.9)", color: "white" }}>
            Free cancellation
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 h-16"
          style={{ background: "linear-gradient(transparent, hsla(0,0%,0%,0.5))" }} />
        <div className="absolute bottom-2 left-2.5 flex items-center gap-0.5">
          {Array.from({ length: stars }).map((_, i) => (
            <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
          ))}
        </div>
      </div>

      <div className="p-3 space-y-1.5">
        <h3 className="text-[13px] font-bold leading-tight line-clamp-2 text-foreground">
          {name}
        </h3>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="line-clamp-1">{area}</span>
          {distanceKm != null && (
            <span className="shrink-0 ml-1">· {distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`}</span>
          )}
        </div>

        <div className="flex items-end justify-between pt-1">
          <div>
            <span className="text-[15px] font-black text-foreground">
              {currency} {pricePerNight.toLocaleString()}
            </span>
            <span className="text-[11px] ml-0.5 text-muted-foreground">
              /night
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            className="h-8 px-3 rounded-xl text-[11px] font-bold gap-1"
            style={{
              background: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
            }}
            onClick={handleBook}
            disabled={busy}
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageCircle className="h-3 w-3" />}
            Book
          </Button>
        </div>
      </div>
    </Link>
  );
});

export default StayCard;
