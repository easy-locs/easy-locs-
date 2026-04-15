import * as React from "react";
import { cn } from "@/lib/utils";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Inbox } from "lucide-react";
import { tc } from "@/lib/i18n-canonical";
import { PAGE_HEADER_SPACING, PAGE_CONTENT_SPACING } from "@/components/layout/page-spacing";

interface PageShellProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full" | "default";
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ElementType;
}

const WIDTH_MAP: Record<string, string> = {
  sm: "max-w-2xl",
  md: "max-w-3xl",
  lg: "max-w-5xl",
  xl: "max-w-7xl",
  full: "w-full",
  default: "page-content",
};

const PageShell = ({
  title,
  description,
  actions,
  children,
  className,
  maxWidth = "default",
  loading,
  error,
  onRetry,
  isEmpty,
  emptyTitle,
  emptyDescription,
  emptyIcon: EmptyIcon = Inbox,
}: PageShellProps) => {
  return (
    <div className={cn(WIDTH_MAP[maxWidth], "mx-auto page-fade-in", className)}>
      <div className={cn("flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3", PAGE_HEADER_SPACING)}>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{description}</p>}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {actions}
          </div>
        )}
      </div>
      <div className={PAGE_CONTENT_SPACING}>
        {loading ? (
          <LoadingState variant="inline" />
        ) : error ? (
          <ErrorState message={error} onRetry={onRetry} />
        ) : isEmpty ? (
          <EmptyState
            icon={EmptyIcon}
            title={emptyTitle || tc("common.empty_state")}
            description={emptyDescription}
          />
        ) : (
          children
        )}
      </div>
    </div>
  );
};

export { PageShell };
export type { PageShellProps };
