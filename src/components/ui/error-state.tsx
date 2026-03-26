import { AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { tc } from "@/lib/i18n-canonical";

interface ErrorStateProps {
  message?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

/**
 * Canonical error state — i18n-aware with motion + retry.
 */
const ErrorState = ({
  message,
  description,
  onRetry,
  className,
  compact = false,
}: ErrorStateProps) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, ease: "easeOut" }}
    className={cn(
      "flex flex-col items-center justify-center text-center",
      compact ? "py-6 px-3" : "py-12 px-4",
      className,
    )}
  >
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 20 }}
      className={cn(
        "rounded-2xl bg-destructive/10 flex items-center justify-center mb-4",
        compact ? "w-11 h-11" : "w-14 h-14",
      )}
    >
      <AlertTriangle className={cn("text-destructive", compact ? "h-5 w-5" : "h-7 w-7")} />
    </motion.div>
    <h3 className={cn("font-semibold text-foreground mb-1", compact ? "text-sm" : "text-base")}>
      {message || tc("common.error")}
    </h3>
    <p className={cn("text-muted-foreground max-w-sm", compact ? "text-xs" : "text-sm")}>
      {description || tc("common.error_description")}
    </p>
    {onRetry && (
      <Button variant="outline" size="sm" onClick={onRetry} className="mt-4 gap-2">
        <RefreshCw className="h-4 w-4" /> {tc("common.retry")}
      </Button>
    )}
  </motion.div>
);

export { ErrorState };
export type { ErrorStateProps };
