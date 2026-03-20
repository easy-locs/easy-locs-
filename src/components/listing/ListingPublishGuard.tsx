/**
 * ListingPublishGuard — Shows validation errors and disables publish if data is incomplete.
 */
import { validateListingPublish, detectSuspiciousListing, type ListingPublishData } from "@/lib/validation/listing-publish-validator";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ListingPublishGuardProps {
  data: ListingPublishData;
  onPublish: () => void;
  loading?: boolean;
  className?: string;
}

export default function ListingPublishGuard({
  data,
  onPublish,
  loading,
  className,
}: ListingPublishGuardProps) {
  const result = validateListingPublish(data);
  const suspiciousFlags = detectSuspiciousListing(data);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Errors */}
      {result.errors.length > 0 && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 space-y-1.5">
          <p className="text-xs font-bold text-destructive flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" /> Required before publishing
          </p>
          {result.errors.map((err, i) => (
            <p key={i} className="text-xs text-destructive/80 pl-5">• {err}</p>
          ))}
        </div>
      )}

      {/* Warnings */}
      {result.warnings.length > 0 && result.canPublish && (
        <div className="rounded-xl bg-warning/10 border border-warning/20 p-3 space-y-1.5">
          <p className="text-xs font-bold text-warning-foreground flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Suggestions
          </p>
          {result.warnings.map((w, i) => (
            <p key={i} className="text-xs text-warning-foreground/80 pl-5">• {w}</p>
          ))}
        </div>
      )}

      {/* Suspicious flags */}
      {suspiciousFlags.length > 0 && (
        <div className="rounded-xl bg-warning/10 border border-warning/20 p-3 space-y-1.5">
          <p className="text-xs font-bold text-warning-foreground flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Review needed
          </p>
          {suspiciousFlags.map((f, i) => (
            <p key={i} className="text-xs text-warning-foreground/80 pl-5">• {f}</p>
          ))}
        </div>
      )}

      {/* Ready state */}
      {result.canPublish && result.errors.length === 0 && (
        <div className="rounded-xl bg-success/10 border border-success/20 p-3">
          <p className="text-xs font-bold text-success flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Ready to publish
          </p>
        </div>
      )}

      {/* Publish button */}
      <Button
        onClick={onPublish}
        disabled={!result.canPublish || loading}
        className="w-full h-12 rounded-2xl text-sm font-bold active:scale-[0.97] transition-transform"
      >
        {loading ? "Publishing…" : result.canPublish ? "Publish Listing" : "Complete required fields"}
      </Button>
    </div>
  );
}
