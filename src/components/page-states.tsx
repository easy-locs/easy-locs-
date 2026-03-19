/**
 * Page state components — Loading, Empty, Error.
 * Reusable across all pages for consistent UX.
 */
import type { ReactNode } from "react";

export function PageLoadingState({ title = "Loading..." }: { title?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-muted-foreground text-sm">{title}</p>
      </div>
    </div>
  );
}

export function PageEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center bg-background">
      <div className="text-center space-y-2 max-w-sm">
        <p className="text-lg font-medium text-foreground">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        {action && <div className="pt-2">{action}</div>}
      </div>
    </div>
  );
}

export function PageErrorState({
  title = "Something went wrong",
  message,
  description,
  action,
}: {
  title?: string;
  message?: string;
  description?: string;
  action?: ReactNode;
}) {
  const displayMessage = description || message;
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-2 max-w-sm">
        <p className="text-lg font-semibold text-destructive">{title}</p>
        {displayMessage && <p className="text-sm text-muted-foreground">{displayMessage}</p>}
        {action && <div className="pt-2">{action}</div>}
      </div>
    </div>
  );
}
