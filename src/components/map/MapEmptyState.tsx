/**
 * MapEmptyState — Shared empty/no-data state for all map screens.
 * Ensures consistent visual language across Nearby, Delivery, Drivers, Order Tracking.
 */
import { MapPin, RotateCcw } from "lucide-react";

interface Props {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  onRetry?: () => void;
  retryLabel?: string;
  /** Extra stat to show */
  stat?: string;
}

export default function MapEmptyState({ icon, title, subtitle, onRetry, retryLabel = "Refresh", stat }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
        {icon || <MapPin className="h-6 w-6 text-primary/60" />}
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-0.5">{title}</h3>
      {subtitle && <p className="text-xs text-muted-foreground max-w-[240px]">{subtitle}</p>}
      {stat && <p className="text-[10px] text-muted-foreground mt-1">{stat}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary px-4 py-1.5 rounded-full border border-primary/20 hover:bg-primary/5 transition-colors active:scale-95"
        >
          <RotateCcw className="h-3 w-3" /> {retryLabel}
        </button>
      )}
    </div>
  );
}
