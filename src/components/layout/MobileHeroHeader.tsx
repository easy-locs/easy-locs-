import React from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileHeroHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  backgroundImage?: string;
  onBack?: () => void;
  search?: React.ReactNode;
  accentClassName?: string;
}

export function MobileHeroHeader({
  title,
  subtitle,
  icon,
  backgroundImage,
  onBack,
  search,
  accentClassName,
}: MobileHeroHeaderProps) {
  return (
    <div
      className={cn("mobile-hero bg-primary text-primary-foreground", accentClassName)}
      style={
        backgroundImage
          ? {
              backgroundImage: `linear-gradient(to bottom, hsl(var(--primary) / 0.85), hsl(var(--primary) / 0.95)), url(${backgroundImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      <div className="mobile-hero__top">
        {onBack ? (
          <button
            className="mobile-hero__back bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground transition-colors"
            onClick={onBack}
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : null}

        <div className="mobile-hero__titleWrap">
          <h1 className="mobile-hero__title">
            {icon ? <span className="mobile-hero__icon">{icon}</span> : null}
            <span className="mobile-hero__titleText">{title}</span>
          </h1>

          {subtitle ? (
            <p className="mobile-hero__subtitle">{subtitle}</p>
          ) : null}
        </div>
      </div>

      {search ? <div className="mt-4">{search}</div> : null}
    </div>
  );
}
