import { memo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PackageOpen } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  className?: string;
}

export const EmptyState = memo(function EmptyState({
  icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  onCtaClick,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center gap-3 py-16 text-center px-4 ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-2">
        {icon ?? <PackageOpen className="h-8 w-8 text-muted-foreground/40" />}
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">{description}</p>
      )}
      {ctaLabel && ctaHref && (
        <Link to={ctaHref}>
          <Button variant="outline" size="sm" className="mt-2 rounded-xl">
            {ctaLabel}
          </Button>
        </Link>
      )}
      {ctaLabel && onCtaClick && !ctaHref && (
        <Button variant="outline" size="sm" className="mt-2 rounded-xl" onClick={onCtaClick}>
          {ctaLabel}
        </Button>
      )}
    </div>
  );
});
