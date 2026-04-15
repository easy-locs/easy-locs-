import type { ReactNode, CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { SUBPAGE_HEADER_SPACING, SUBPAGE_CONTENT_SPACING } from "@/components/layout/page-spacing";

interface SubPageShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  noContentPad?: boolean;
  fullScreen?: boolean;
  style?: CSSProperties;
}

export default function SubPageShell({
  children,
  title,
  subtitle,
  onBack,
  rightAction,
  className,
  headerClassName,
  contentClassName,
  noContentPad,
  fullScreen,
  style,
}: SubPageShellProps) {
  const hasHeader = title || onBack || rightAction;

  return (
    <div
      className={cn(
        "app-mobile-page flex flex-col",
        fullScreen && "relative overflow-hidden",
        className
      )}
      style={style}
    >
      {hasHeader && (
        <header
          className={cn(
            "sticky top-0 z-30 flex items-center gap-3 bg-background/80 backdrop-blur-xl border-b border-border/5",
            SUBPAGE_HEADER_SPACING,
            headerClassName
          )}
        >
          {onBack && (
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-all duration-200 bg-card border border-border/10 shrink-0 hover:bg-muted/60"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4 text-foreground" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            {title && (
              <h1 className="text-base font-bold text-foreground leading-tight">{title}</h1>
            )}
            {subtitle && (
              <p className="text-token-xs text-muted-foreground leading-tight">{subtitle}</p>
            )}
          </div>
          {rightAction && (
            <div className="shrink-0">{rightAction}</div>
          )}
        </header>
      )}
      <div className={cn("flex-1", !noContentPad && !fullScreen && SUBPAGE_CONTENT_SPACING, contentClassName)}>
        {children}
      </div>
    </div>
  );
}
