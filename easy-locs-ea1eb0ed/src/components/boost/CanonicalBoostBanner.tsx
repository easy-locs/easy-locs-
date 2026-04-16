/**
 * CanonicalBoostBanner — Smart sponsored placement that inherits vertical theming.
 * Renders only if boost engine returns a match for the given slot.
 */
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { AppCard, CardContent } from "@/components/ui/AppCard";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight } from "lucide-react";
import { useCanonicalUI } from "@/hooks/useCanonicalUI";
import type { BoostMatch } from "@/lib/boost/canonical-boost-engine";
import { trackBoostImpression, trackBoostClick } from "@/lib/boost/canonical-boost-engine";
import { useAuth } from "@/contexts/AuthContext";

interface CanonicalBoostBannerProps {
  match: BoostMatch;
  variant?: "inline" | "hero" | "card" | "micro";
  className?: string;
  onClickTracked?: () => void;
}

export function CanonicalBoostBanner({
  match,
  variant = "inline",
  className = "",
  onClickTracked,
}: CanonicalBoostBannerProps) {
  const { user } = useAuth();
  const tracked = useRef(false);
  const ui = useCanonicalUI(
    match.creative.canonical_vertical,
    match.creative.canonical_subcategory
  );

  useEffect(() => {
    if (!tracked.current) {
      trackBoostImpression(match, user?.id);
      tracked.current = true;
    }
  }, [match, user?.id]);

  const handleClick = () => {
    trackBoostClick(match, "cta", user?.id);
    onClickTracked?.();
  };

  const target = match.creative.cta_target || `/s/${match.campaign.entity_id}`;

  if (variant === "micro") {
    return (
      <Link to={target} onClick={handleClick} className={className}>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors">
          <Sparkles className="h-3 w-3 text-primary shrink-0" />
          <span className="text-xs font-medium truncate">{match.creative.title}</span>
          <ArrowRight className="h-3 w-3 text-primary shrink-0" />
        </div>
      </Link>
    );
  }

  if (variant === "hero") {
    return (
      <Link to={target} onClick={handleClick} className={`block ${className}`}>
        <div
          className="relative rounded-2xl overflow-hidden h-44 md:h-56"
          style={{
            background: `linear-gradient(135deg, hsl(${ui.accentHsl} / 0.15), hsl(${ui.accentHsl} / 0.05))`,
          }}
        >
          {match.creative.image_url && (
            <img
              src={match.creative.image_url}
              alt={match.creative.title}
              className="absolute inset-0 w-full h-full object-cover opacity-30"
              loading="lazy"
            />
          )}
          <div className="relative z-10 flex flex-col justify-end h-full p-5">
            <Badge
              variant="secondary"
              className="w-fit mb-2 text-[0.625rem] px-2 py-0.5 bg-primary/10 text-primary border-0"
            >
              <Sparkles className="h-2.5 w-2.5 mr-1" />
              Sponsored
            </Badge>
            <h3 className="text-lg font-bold text-foreground">{match.creative.title}</h3>
            {match.creative.subtitle && (
              <p className="text-sm text-muted-foreground mt-0.5">{match.creative.subtitle}</p>
            )}
            <span
              className="mt-2 inline-flex items-center gap-1 text-sm font-semibold"
              style={{ color: `hsl(${ui.accentHsl})` }}
            >
              {match.creative.cta_label}
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </Link>
    );
  }

  // Default: inline/card
  return (
    <Link to={target} onClick={handleClick} className={className}>
      <AppCard className="border-primary/15 bg-primary/[0.03] hover:shadow-md transition-shadow">
        <CardContent className="p-3 flex items-center gap-3">
          {match.creative.image_url ? (
            <img
              src={match.creative.image_url}
              alt={match.creative.title}
              className="w-14 h-14 rounded-xl object-cover shrink-0"
              loading="lazy"
            />
          ) : (
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `hsl(${ui.accentHsl} / 0.1)` }}
            >
              <Sparkles className="h-5 w-5" style={{ color: `hsl(${ui.accentHsl})` }} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Badge
                variant="secondary"
                className="text-[0.625rem] px-1.5 py-0 h-4 bg-primary/10 text-primary border-0"
              >
                <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                Sponsored
              </Badge>
            </div>
            <p className="text-sm font-semibold line-clamp-1 break-words">{match.creative.title}</p>
            {match.creative.subtitle && (
              <p className="text-xs text-muted-foreground line-clamp-1">{match.creative.subtitle}</p>
            )}
          </div>
          <ArrowRight className="h-4 w-4 text-primary shrink-0" />
        </CardContent>
      </AppCard>
    </Link>
  );
}
