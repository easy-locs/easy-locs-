import { memo, useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, Building2, Calendar, MessageCircle, TrendingUp, Loader2 } from "lucide-react";
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
}

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
}: PropertyProjectCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openPayment } = useUnifiedPayment();
  const [busy, setBusy] = useState(false);

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

  return (
    <Link
      to={`/property/project/${slug}`}
      className="group block rounded-2xl overflow-hidden transition-all duration-200 active:scale-[0.97] border border-border/15 bg-card shadow-sm"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={image}
          alt={projectName}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
          style={{ background: "hsla(38,70%,50%,0.9)", color: "white" }}>
          New Project
        </div>
        {paymentPlan && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold"
            style={{ background: "hsla(220,50%,50%,0.85)", color: "white" }}>
            <TrendingUp className="h-3 w-3" />
            {paymentPlan}
          </div>
        )}
      </div>

      <div className="p-3 space-y-1.5">
        <h3 className="text-[13px] font-bold leading-tight line-clamp-2 text-foreground">
          {projectName}
        </h3>
        <div className="flex items-center gap-1 text-[11px] font-medium text-primary">
          <Building2 className="h-3 w-3 shrink-0" />
          <span className="line-clamp-1">{developer}</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="line-clamp-1">{area}</span>
        </div>

        {completionDate && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Calendar className="h-3 w-3" />
            Completion: {completionDate}
          </div>
        )}

        <div className="flex items-end justify-between pt-1">
          <div>
            <span className="text-[10px] block text-muted-foreground">Starting from</span>
            <span className="text-[15px] font-black text-foreground">
              {currency} {startingPrice >= 1_000_000 ? `${(startingPrice / 1_000_000).toFixed(1)}M` : startingPrice.toLocaleString()}
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
            onClick={handleExplore}
            disabled={busy}
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageCircle className="h-3 w-3" />}
            Explore
          </Button>
        </div>
      </div>
    </Link>
  );
});

export default PropertyProjectCard;
