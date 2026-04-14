import { memo, useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, BedDouble, Bath, Maximize2, MessageCircle, CheckCircle2, Loader2, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUnifiedPayment } from "@/payments/UnifiedPaymentSystem";
import { executeUniversalAction } from "@/lib/action-engine";

export interface PropertyRentCardProps {
  id: string;
  slug: string;
  title: string;
  area: string;
  image: string;
  bedrooms: number;
  bathrooms: number;
  sizeSqft: number;
  annualRent: number;
  monthlyRent?: number;
  currency?: string;
  furnished?: "furnished" | "unfurnished" | "semi_furnished";
  availableNow?: boolean;
  cheques?: number;
  brokerName?: string;
  brokerId?: string;
}

const GOLD = "hsl(var(--accent))";
const NAVY = "hsl(226 24% 14%)";

const PropertyRentCard = memo(function PropertyRentCard({
  slug,
  title,
  area,
  image,
  bedrooms,
  bathrooms,
  sizeSqft,
  annualRent,
  monthlyRent,
  currency = "AED",
  furnished,
  availableNow,
  brokerName,
  brokerId,
}: PropertyRentCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openPayment } = useUnifiedPayment();
  const [busy, setBusy] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const safeAnnualRent = annualRent ?? 0;
  const furnishedLabel = furnished === "furnished" ? "Furnished" : furnished === "semi_furnished" ? "Semi" : "Unfurnished";

  const handleContact = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    await executeUniversalAction(
      {
        entityType: "property_rent",
        action: "chat",
        slug,
        title,
        recipientId: brokerId || null,
        recipientName: brokerName || null,
      },
      { navigate, openPayment, currentUserId: user?.id },
    );
    setBusy(false);
  }, [slug, title, brokerId, brokerName, navigate, openPayment, user?.id]);

  return (
    <Link
      to={`/property/${slug}`}
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
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            style={{ opacity: imgLoaded ? 1 : 0 }}
          />
        )}
        {imgError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl">🏢</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20" style={{ background: "linear-gradient(transparent, hsl(0 0% 0% / 0.4))" }} />

        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          {availableNow && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold backdrop-blur-md"
              style={{ background: "hsl(142 60% 45% / 0.9)", color: "white" }}>
              <CheckCircle2 className="h-3 w-3" />
              Available
            </span>
          )}
          {furnished && (
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold backdrop-blur-md"
              style={{ background: "hsl(226 24% 14% / 0.75)", color: "white" }}>
              {furnishedLabel}
            </span>
          )}
        </div>

        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <div>
            <span className="text-lg font-extrabold text-white drop-shadow-md tabular-nums">
              {currency} {safeAnnualRent.toLocaleString()}
            </span>
            <span className="text-xs text-white/70 ml-1">/year</span>
          </div>
          {monthlyRent && (
            <span className="text-[11px] text-white/80 font-medium backdrop-blur-sm px-2 py-0.5 rounded-md"
              style={{ background: "hsl(0 0% 0% / 0.3)" }}>
              {currency} {monthlyRent.toLocaleString()}/mo
            </span>
          )}
        </div>
      </div>

      <div className="p-3.5 space-y-2.5">
        <h3 className="text-sm font-bold leading-snug line-clamp-2 break-words min-w-0 text-foreground group-hover:text-[hsl(168_72%_44%)] transition-colors">
          {title}
        </h3>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
          <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: GOLD }} />
          <span className="line-clamp-1 min-w-0">{area}</span>
        </div>

        <div className="flex items-center gap-1 pt-0.5">
          {[
            { icon: BedDouble, label: `${bedrooms} Bed${bedrooms !== 1 ? "s" : ""}` },
            { icon: Bath, label: `${bathrooms} Bath` },
            { icon: Maximize2, label: `${sizeSqft.toLocaleString()} sqft` },
          ].map((spec) => (
            <span key={spec.label} className="flex items-center gap-1 text-[11px] text-muted-foreground px-2 py-1 rounded-lg"
              style={{ background: "hsl(var(--muted) / 0.6)" }}>
              <spec.icon className="h-3 w-3" />
              {spec.label}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between pt-1">
          {brokerName && (
            <span className="text-[11px] text-muted-foreground truncate max-w-[140px]">
              by {brokerName}
            </span>
          )}
          {!brokerName && <span />}
          <Button
            type="button"
            size="sm"
            className="h-9 px-4 rounded-xl text-[11px] font-bold gap-1.5 shrink-0"
            style={{ background: GOLD, color: NAVY }}
            onClick={handleContact}
            disabled={busy}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
            Contact
          </Button>
        </div>
      </div>
    </Link>
  );
});

export default PropertyRentCard;
