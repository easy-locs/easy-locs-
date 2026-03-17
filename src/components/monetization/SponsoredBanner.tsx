/**
 * SponsoredBanner — PASS143: Lightweight sponsored placement in feeds.
 * Shows a single promoted item with "Sponsored" label.
 * Tracks impression on mount, click on tap.
 */
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, ArrowRight } from "lucide-react";
import { useAdTracking } from "@/hooks/useAdTracking";
import { isActiveBoosted, type RankableItem } from "@/lib/ranking-engine";

interface SponsoredBannerProps {
  item: RankableItem & {
    photo_url?: string | null;
    slug?: string;
    shop_slug?: string;
    shop_id?: string;
    description?: string | null;
  };
  placement?: string;
  linkTo?: string;
}

export function SponsoredBanner({ item, placement = "feed", linkTo }: SponsoredBannerProps) {
  const { trackImpression, trackClick } = useAdTracking();
  const tracked = useRef(false);

  // Only render for actively boosted items
  if (!isActiveBoosted(item)) return null;

  const href = linkTo || (item.shop_slug ? `/s/${item.shop_slug}/${item.id}` : `/s/${item.slug || item.id}`);

  useEffect(() => {
    if (!tracked.current) {
      trackImpression("listing", item.id, placement, item.shop_id);
      tracked.current = true;
    }
  }, [item.id, placement, item.shop_id, trackImpression]);

  return (
    <Link
      to={href}
      onClick={() => trackClick("listing", item.id, placement, item.shop_id)}
    >
      <Card className="border-primary/20 bg-primary/5 hover:shadow-md transition-shadow overflow-hidden">
        <CardContent className="p-3 flex items-center gap-3">
          {item.photo_url ? (
            <img
              src={item.photo_url}
              alt={item.title || "Sponsored"}
              className="w-14 h-14 rounded-lg object-cover shrink-0"
              loading="lazy"
            />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-0">
                <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                Sponsored
              </Badge>
            </div>
            <p className="text-sm font-semibold truncate">{item.title}</p>
            {item.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
            )}
          </div>
          <ArrowRight className="h-4 w-4 text-primary shrink-0" />
        </CardContent>
      </Card>
    </Link>
  );
}
