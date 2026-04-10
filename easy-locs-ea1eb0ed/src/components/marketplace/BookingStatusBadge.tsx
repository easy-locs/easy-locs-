import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, X, AlertTriangle, CreditCard, RefreshCw, Edit, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const BOOKING_STATUS_KEYS: Record<string, string> = {
  new: "mp.status_new",
  pending: "mp.status_pending",
  awaiting_payment: "mp.status_awaiting_payment",
  confirmed: "mp.status_confirmed",
  modified: "mp.status_modified",
  cancelled: "mp.status_cancelled",
  completed: "mp.status_completed",
  refunded: "mp.status_refunded",
};

const BOOKING_STATUS_FALLBACKS: Record<string, string> = {
  new: "New Request",
  pending: "Pending",
  awaiting_payment: "Awaiting Payment",
  confirmed: "Confirmed",
  modified: "Modified",
  cancelled: "Cancelled",
  completed: "Completed",
  refunded: "Refunded",
};

const BOOKING_STATUS_CONFIG: Record<string, { variant: "outline" | "default" | "secondary" | "destructive"; icon: any; color: string }> = {
  new: { variant: "outline", icon: Clock, color: "text-primary" },
  pending: { variant: "outline", icon: Loader2, color: "text-warning" },
  awaiting_payment: { variant: "secondary", icon: CreditCard, color: "text-warning" },
  confirmed: { variant: "default", icon: CheckCircle2, color: "text-success" },
  modified: { variant: "secondary", icon: Edit, color: "text-accent" },
  cancelled: { variant: "destructive", icon: X, color: "text-destructive" },
  completed: { variant: "default", icon: CheckCircle2, color: "text-success" },
  refunded: { variant: "outline", icon: RefreshCw, color: "text-muted-foreground" },
};

// Backward-compatible export with label property
export const BOOKING_STATUSES = Object.fromEntries(
  Object.entries(BOOKING_STATUS_CONFIG).map(([key, config]) => [
    key,
    { ...config, label: BOOKING_STATUS_FALLBACKS[key] || key },
  ])
) as Record<string, { label: string; variant: "outline" | "default" | "secondary" | "destructive"; icon: any; color: string }>;

export type BookingStatus = keyof typeof BOOKING_STATUS_CONFIG;

export default function BookingStatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const config = BOOKING_STATUS_CONFIG[status] || BOOKING_STATUS_CONFIG.pending;
  const Icon = config.icon;
  const label = t(BOOKING_STATUS_KEYS[status] || "") || BOOKING_STATUS_FALLBACKS[status] || status;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className={`h-3 w-3 ${config.color}`} />
      {label}
    </Badge>
  );
}
