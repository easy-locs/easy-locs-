import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { tc } from "@/lib/i18n-canonical";
import { RadarSvg } from "@/components/brand/EasyLocsLogo";

interface ErrorStateProps {
  message?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

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
        "flex items-center justify-center mb-4 relative",
        compact ? "w-11 h-11" : "w-14 h-14",
      )}
    >
      <div className="absolute inset-0 rounded-2xl bg-destructive/10 blur-xl" />
      <RadarSvg
        size={compact ? 28 : 36}
        animate={false}
        gradientColors={["hsl(var(--destructive) / 0.5)", "hsl(var(--destructive) / 0.3)"]}
      />
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
