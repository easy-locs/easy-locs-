import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-muted text-muted-foreground" },
  reminded: { label: "Reminded", className: "bg-warning/15 text-warning border-warning/30" },
  late: { label: "Late", className: "bg-destructive/15 text-destructive border-destructive/30" },
  dunning: { label: "Dunning", className: "bg-destructive/20 text-destructive border-destructive/40" },
  partial: { label: "Partial", className: "bg-info/15 text-info border-info/30" },
  paid: { label: "Paid", className: "bg-success/15 text-success border-success/30" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground" },
  written_off: { label: "Written Off", className: "bg-muted text-muted-foreground" },
  archived: { label: "Archived", className: "bg-muted text-muted-foreground" },
};

export default function RentStatusBadge({ status }: { status: string }) {
  const config = STATUS_MAP[status] || { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <Badge variant="outline" className={cn("text-[10px] font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}
