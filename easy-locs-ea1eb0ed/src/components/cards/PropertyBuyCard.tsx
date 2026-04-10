import { memo, useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, BedDouble, Bath, Maximize2, MessageCircle, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUnifiedPayment } from "@/payments/UnifiedPaymentSystem";
import { executeUniversalAction } from "@/lib/action-engine";

export interface PropertyBuyCardProps {
  id: string;
  slug: string;
  title: string;
  area: string;
  image: string;
  bedrooms: number;
  bathrooms: number;
  sizeSqft: number;
  totalPrice: number;
  pricePerSqft?: number;
  currency?: string;
  isOffPlan?: boolean;
  readyStatus?: string;
  brokerName?: string;
  brokerId?: string;
  paymentPlan?: string;
}

const PropertyBuyCard = memo(function PropertyBuyCard({
  slug,
  title,
  area,
  image,
  bedrooms,
  bathrooms,
  sizeSqft,
  totalPrice,
  pricePerSqft,
  currency = "AED",
  isOffPlan,
  readyStatus,
  brokerName,
  brokerId,
}: PropertyBuyCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openPayment } = useUnifiedPayment();
  const [busy, setBusy] = useState(false);

  const handleContact = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    await executeUniversalAction(
      {
        entityType: "property_buy",
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
      className="group block rounded-2xl overflow-hidden transition-all duration-200 active:scale-[0.97] border border-border/15 bg-card shadow-sm"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {isOffPlan && (
          <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
            style={{ background: "hsla(38,70%,50%,0.9)", color: "white" }}>
            Off-Plan
          </div>
        )}
        {readyStatus && !isOffPlan && (
          <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md text-[10px] font-bold"
            style={{ background: "hsla(142,60%,45%,0.9)", color: "white" }}>
            {readyStatus}
          </div>
        )}
        {brokerName && (
          <div className="absolute bottom-2 right-2.5 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold"
            style={{ background: "hsla(0,0%,0%,0.55)", backdropFilter: "blur(8px)", color: "white" }}>
            <Building2 className="h-3 w-3" />
            {brokerName}
          </div>
        )}
      </div>

      <div className="p-3 space-y-1.5">
        <h3 className="text-[13px] font-bold leading-tight line-clamp-2 text-foreground">
          {title}
        </h3>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="line-clamp-1">{area}</span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" /> {bedrooms}</span>
          <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" /> {bathrooms}</span>
          <span className="flex items-center gap-1"><Maximize2 className="h-3.5 w-3.5" /> {sizeSqft.toLocaleString()} sqft</span>
        </div>

        <div className="flex items-end justify-between pt-1">
          <div>
            <span className="text-[15px] font-black text-foreground">
              {currency} {totalPrice >= 1_000_000 ? `${(totalPrice / 1_000_000).toFixed(1)}M` : totalPrice.toLocaleString()}
            </span>
            {pricePerSqft && (
              <span className="block text-[10px] mt-0.5 text-muted-foreground">
                {currency} {pricePerSqft.toLocaleString()}/sqft
              </span>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            className="h-8 px-3 rounded-xl text-[11px] font-bold gap-1"
            style={{
              background: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
            }}
            onClick={handleContact}
            disabled={busy}
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageCircle className="h-3 w-3" />}
            Contact
          </Button>
        </div>
      </div>
    </Link>
  );
});

export default PropertyBuyCard;
