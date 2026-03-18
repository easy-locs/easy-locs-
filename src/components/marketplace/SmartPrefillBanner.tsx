/**
 * SmartPrefillBanner — Shows detected context suggestion with confirm/dismiss.
 */
import { Check, X, Sparkles } from "lucide-react";
import type { DetectedContext } from "@/lib/smart-prefill";
import { getCategoryConfig } from "@/lib/category-config";

interface Props {
  detection: DetectedContext | null;
  onAccept: () => void;
  onDismiss: () => void;
  visible: boolean;
}

const ENTITY_LABELS: Record<string, string> = {
  fixed_store: "Fixed Store",
  mobile_seller: "Mobile Seller",
  mobile_service: "Mobile Service",
  driver: "Driver / Delivery",
};

export default function SmartPrefillBanner({ detection, onAccept, onDismiss, visible }: Props) {
  if (!visible || !detection || detection.confidence < 0.25) return null;

  const cat = getCategoryConfig(detection.category);

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-accent/30 bg-accent/5 animate-in fade-in slide-in-from-top-2 duration-300">
      <Sparkles className="h-5 w-5 text-accent shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">
          Smart detection
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {cat.icon} {cat.name} · {detection.listing_type} · {ENTITY_LABELS[detection.entity_type] || detection.entity_type}
        </p>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <button
          onClick={onAccept}
          className="p-1.5 rounded-lg bg-accent text-accent-foreground hover:bg-accent/90 transition-colors"
          title="Apply suggestion"
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          onClick={onDismiss}
          className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors"
          title="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
