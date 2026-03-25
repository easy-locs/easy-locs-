/**
 * Page state components — Loading (skeleton), Empty, Error.
 * NO full-screen spinners. Skeleton-first approach.
 */
import type { ReactNode } from "react";

export function PageLoadingState({ title = "Loading..." }: { title?: string }) {
  return (
    <div className="px-4 py-6 space-y-4 max-w-md mx-auto">
      <div className="h-8 w-40 rounded-xl bg-muted/40 animate-pulse" />
      <div className="h-4 w-56 rounded-lg bg-muted/30 animate-pulse" />
      <div className="space-y-3 pt-2">
        <div className="h-20 w-full rounded-2xl bg-muted/30 animate-pulse" />
        <div className="h-20 w-full rounded-2xl bg-muted/25 animate-pulse" />
        <div className="h-20 w-full rounded-2xl bg-muted/20 animate-pulse" />
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
    <div className="min-h-[50vh] flex items-center justify-center bg-background">
      <div className="text-center space-y-2 max-w-sm">
        <p className="text-lg font-semibold text-destructive">{title}</p>
        {displayMessage && <p className="text-sm text-muted-foreground">{displayMessage}</p>}
        {action && <div className="pt-2">{action}</div>}
      </div>
    </div>
  );
}
