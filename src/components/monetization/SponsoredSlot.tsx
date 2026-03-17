/**
 * SponsoredSlot — Generic sponsored placement slot for any feed.
 * Renders a SponsoredBanner if the feed item is flagged as sponsored.
 * Automatically tracks impressions/clicks via useAdTracking.
 */
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, ArrowRight } from "lucide-react";
import { useAdTracking } from "@/hooks/useAdTracking";

interface SponsoredSlotProps {
  id: string;
  title: string;
  description?: string | null;
  photoUrl?: string | null;
  linkTo: string;
  targetType?: string;
  shopId?: string;
  placement?: string;
  tier?: string;
}

export function SponsoredSlot({
  id,
  title,
  description,
  photoUrl,
  linkTo,
  targetType = "listing",
  shopId,
  placement = "feed",
  tier,
}: SponsoredSlotProps) {
  const { trackImpression, trackClick } = useAdTracking();
  const tracked = useRef(false);

  useEffect(() => {
    if (!tracked.current) {
      trackImpression(targetType, id, placement, shopId);
      tracked.current = true;
    }
  }, [id, targetType, placement, shopId, trackImpression]);

  return (
    <Link to={linkTo} onClick={() => trackClick(targetType, id, placement, shopId)}>
      <Card className="border-primary/20 bg-primary/5 hover:shadow-md transition-shadow">
        <CardContent className="p-3 flex items-center gap-3">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={title}
              className="w-12 h-12 rounded-lg object-cover shrink-0"
              loading="lazy"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-0"
              >
                <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                Sponsored
              </Badge>
              {tier && (
                <span className="text-[9px] text-muted-foreground capitalize">{tier}</span>
              )}
            </div>
            <p className="text-sm font-semibold truncate">{title}</p>
            {description && (
              <p className="text-xs text-muted-foreground line-clamp-1">{description}</p>
            )}
          </div>
          <ArrowRight className="h-4 w-4 text-primary shrink-0" />
        </CardContent>
      </Card>
    </Link>
  );
}
