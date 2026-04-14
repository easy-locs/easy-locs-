/**
 * SubPageShell — Standard wrapper for all non-pillar sub-pages.
 *
 * Layout contract:
 *  - Root div: `app-mobile-page` → full-screen (min-h-[100dvh]), themed bg/fg,
 *              bottom-nav padding (var(--page-bottom-pad)) all via CSS.
 *  - Optional sticky header with back button + title + optional right action.
 *  - Content area: flex-1 with consistent px-4 padding.
 *
 * Usage (with header):
 *   <SubPageShell title="Account" onBack={() => navigate("/settings")}>
 *     ...
 *   </SubPageShell>
 *
 * Usage (no header, full control):
 *   <SubPageShell>
 *     <header>...</header>
 *     ...
 *   </SubPageShell>
 */
import type { ReactNode, CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

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
  style,
}: SubPageShellProps) {
  const hasHeader = title || onBack || rightAction;

  return (
    <div className={cn("app-mobile-page flex flex-col", className)} style={style}>
      {hasHeader && (
        <header
          className={cn(
            "sticky top-0 z-30 flex items-center gap-3 px-4 pt-4 pb-3 bg-background/80 backdrop-blur-xl border-b border-border/5",
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
              <p className="text-[11px] text-muted-foreground leading-tight">{subtitle}</p>
            )}
          </div>
          {rightAction && (
            <div className="shrink-0">{rightAction}</div>
          )}
        </header>
      )}
      <div className={cn("flex-1", !noContentPad && "px-4 pt-3", contentClassName)}>
        {children}
      </div>
    </div>
  );
}
