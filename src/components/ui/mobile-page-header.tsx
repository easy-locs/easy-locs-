/**
 * MobilePageHeader — Consistent back-nav header for sub-pages.
 * Provides unified page header with optional back button, title, and actions.
 * Uses browser history stack first, falls back to explicit backTo route.
 */
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface MobilePageHeaderProps {
  title: string;
  subtitle?: string;
  backTo?: string;
  showBack?: boolean;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function MobilePageHeader({
  title,
  subtitle,
  backTo,
  showBack = true,
  actions,
  icon,
  className,
}: MobilePageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    // Use browser history if available, otherwise fall back to backTo route
    if (window.history.length > 1) {
      navigate(-1);
    } else if (backTo) {
      navigate(backTo);
    } else {
      navigate("/");
    }
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/40",
        "px-4 py-3 flex items-center gap-3 min-h-[52px]",
        className
      )}
    >
      {showBack && (
        <button
          onClick={handleBack}
          className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-muted/60 active:bg-muted transition-colors shrink-0"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
      )}
      {icon && <div className="shrink-0">{icon}</div>}
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-bold text-foreground truncate">{title}</h1>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-1.5 shrink-0">{actions}</div>
      )}
    </header>
  );
}
