import { AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * Consistent error state with optional retry button.
 */
const ErrorState = ({
  message = "Something went wrong",
  onRetry,
  className,
}: ErrorStateProps) => (
  <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", className)}>
    <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
      <AlertTriangle className="h-7 w-7 text-destructive" />
    </div>
    <h3 className="text-base font-semibold text-foreground mb-1">{message}</h3>
    <p className="text-sm text-muted-foreground">Please try again or contact support.</p>
    {onRetry && (
      <Button variant="outline" size="sm" onClick={onRetry} className="mt-4 gap-2">
        <RefreshCw className="h-4 w-4" /> Retry
      </Button>
    )}
  </div>
);

export { ErrorState };
export type { ErrorStateProps };
