import { memo, useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, Building2, Calendar, ArrowRight, TrendingUp, Loader2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUnifiedPayment } from "@/payments/UnifiedPaymentSystem";
import { executeUniversalAction } from "@/lib/action-engine";

export interface PropertyProjectCardProps {
  id: string;
  slug: string;
  projectName: string;
  developer: string;
  developerId?: string;
  area: string;
  image: string;
  startingPrice: number;
  currency?: string;
  completionDate?: string;
  paymentPlan?: string;
  propertyTypes?: string[];
  photoCount?: number;
}

const GOLD = "hsl(var(--accent))";
const NAVY = "hsl(226 24% 14%)";

const PropertyProjectCard = memo(function PropertyProjectCard({
  slug,
  projectName,
  developer,
  developerId,
  area,
  image,
  startingPrice,
  currency = "AED",
  completionDate,
  paymentPlan,
  photoCount,
}: PropertyProjectCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openPayment } = useUnifiedPayment();
  const [busy, setBusy] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleExplore = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    await executeUniversalAction(
      {
        entityType: "property_project",
        action: "open",
        slug,
        title: projectName,
        recipientId: developerId || null,
        recipientName: developer || null,
      },
      { navigate, openPayment, currentUserId: user?.id },
    );
    setBusy(false);
  }, [slug, projectName, developerId, developer, navigate, openPayment, user?.id]);

  const formattedPrice = startingPrice >= 1_000_000
    ? `${(startingPrice / 1_000_000).toFixed(1)}M`
    : startingPrice.toLocaleString();

  return (
    <Link
      to={`/property/project/${slug}`}
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
            alt={projectName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            style={{ opacity: imgLoaded ? 1 : 0 }}
          />
        )}
        {imgError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl">🏗️</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-24" style={{ background: "linear-gradient(transparent, hsl(0 0% 0% / 0.5))" }} />

        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider backdrop-blur-md"
            style={{ background: GOLD, color: NAVY }}>
            New Project
          </span>
          {paymentPlan && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold backdrop-blur-md"
              style={{ background: "hsl(226 24% 14% / 0.75)", color: "white" }}>
              <TrendingUp className="h-3 w-3" />
              {paymentPlan}
            </span>
          )}
        </div>

        {photoCount && photoCount > 1 && (
          <div className="absolute top-3 right-3">
            <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold backdrop-blur-md"
              style={{ background: "hsl(0 0% 0% / 0.5)", color: "white" }}>
              <Camera className="h-3 w-3" />
              {photoCount}
            </span>
          </div>
        )}

        <div className="absolute bottom-3 left-3">
          <span className="text-[10px] text-white/70 block">Starting from</span>
          <span className="text-lg font-extrabold text-white drop-shadow-md tabular-nums">
            {currency} {formattedPrice}
          </span>
        </div>
      </div>

      <div className="p-3.5 space-y-2.5">
        <h3 className="text-sm font-bold leading-snug line-clamp-2 text-foreground group-hover:text-[hsl(168_72%_44%)] transition-colors">
          {projectName}
        </h3>

        <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: GOLD }}>
          <Building2 className="h-3.5 w-3.5 shrink-0" />
          <span className="line-clamp-1">{developer}</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: GOLD }} />
          <span className="line-clamp-1">{area}</span>
        </div>

        <div className="flex items-center justify-between pt-1">
          {completionDate ? (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground px-2 py-1 rounded-lg"
              style={{ background: "hsl(var(--muted) / 0.6)" }}>
              <Calendar className="h-3 w-3" />
              {completionDate}
            </span>
          ) : <span />}
          <Button
            type="button"
            size="sm"
            className="h-9 px-4 rounded-xl text-[11px] font-bold gap-1.5"
            style={{ background: GOLD, color: NAVY }}
            onClick={handleExplore}
            disabled={busy}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
            Explore
          </Button>
        </div>
      </div>
    </Link>
  );
});

export default PropertyProjectCard;
