import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  pending_signature: { label: "Pending Signature", className: "bg-warning/15 text-warning border-warning/30" },
  signed: { label: "Partially Signed", className: "bg-info/15 text-info border-info/30" },
  active: { label: "Active", className: "bg-success/15 text-success border-success/30" },
  archived: { label: "Archived", className: "bg-muted text-muted-foreground" },
  cancelled: { label: "Cancelled", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

export default function LeaseStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <Badge variant="outline" className={cn("text-[10px] font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}
