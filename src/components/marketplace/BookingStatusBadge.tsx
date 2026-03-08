import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, X, AlertTriangle, CreditCard, RefreshCw, Edit, Loader2 } from "lucide-react";

export const BOOKING_STATUSES = {
  new: { label: "New Request", variant: "outline" as const, icon: Clock, color: "text-blue-500" },
  pending: { label: "Pending Validation", variant: "outline" as const, icon: Loader2, color: "text-amber-500" },
  awaiting_payment: { label: "Awaiting Payment", variant: "secondary" as const, icon: CreditCard, color: "text-orange-500" },
  confirmed: { label: "Confirmed", variant: "default" as const, icon: CheckCircle2, color: "text-emerald-500" },
  modified: { label: "Modified", variant: "secondary" as const, icon: Edit, color: "text-violet-500" },
  cancelled: { label: "Cancelled", variant: "destructive" as const, icon: X, color: "text-destructive" },
  completed: { label: "Completed", variant: "default" as const, icon: CheckCircle2, color: "text-emerald-600" },
  refunded: { label: "Refunded", variant: "outline" as const, icon: RefreshCw, color: "text-muted-foreground" },
} as const;

export type BookingStatus = keyof typeof BOOKING_STATUSES;

export default function BookingStatusBadge({ status }: { status: string }) {
  const config = BOOKING_STATUSES[status as BookingStatus] || BOOKING_STATUSES.pending;
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className={`h-3 w-3 ${config.color}`} />
      {config.label}
    </Badge>
  );
}
