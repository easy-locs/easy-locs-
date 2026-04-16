import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export interface MobilePageHeaderProps {
  title: string;
  subtitle?: string;
  backTo?: string;
  showBack?: boolean;
  onBack?: () => void;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function MobilePageHeader({
  title,
  subtitle,
  backTo,
  showBack = true,
  onBack,
  actions,
  icon,
  className,
}: MobilePageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
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
        "sticky top-0 z-30 bg-[var(--glass-bg-strong)] backdrop-blur-[var(--glass-blur-strong)] saturate-[var(--glass-saturate)] border-b border-[var(--glass-border)] shadow-[0_1px_8px_hsl(var(--foreground)/0.03)]",
        "px-4 py-3 flex items-center gap-3 min-h-[52px]",
        className
      )}
    >
      {showBack && (
        <button
          onClick={handleBack}
          className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-muted/40 active:bg-muted/60 transition-colors shrink-0"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
      )}
      {icon && <div className="shrink-0">{icon}</div>}
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-bold text-foreground whitespace-normal break-words leading-snug tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-[0.6875rem] text-muted-foreground/70 whitespace-normal break-words leading-snug mt-0.5">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-1.5 shrink-0">{actions}</div>
      )}
    </header>
  );
}
