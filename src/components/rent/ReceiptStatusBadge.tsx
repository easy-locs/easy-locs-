/**
 * ReceiptStatusBadge — Shows receipt generation state.
 * States: none | generating | available | validated
 */
import { Receipt, Loader2, CheckCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ReceiptStatusBadgeProps {
  receiptUrl: string | null | undefined;
  validated: boolean;
  paid: boolean;
  className?: string;
}

export default function ReceiptStatusBadge({ receiptUrl, validated, paid, className }: ReceiptStatusBadgeProps) {
  if (!paid) return null;

  if (!receiptUrl) {
    return (
      <Badge variant="outline" className={`gap-1 text-[10px] text-muted-foreground ${className || ""}`}>
        <Loader2 className="h-3 w-3 animate-spin" /> Generating...
      </Badge>
    );
  }

  if (validated) {
    return (
      <Badge variant="outline" className={`gap-1 text-[10px] text-success border-success/30 ${className || ""}`}>
        <CheckCircle className="h-3 w-3" /> Receipt validated
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={`gap-1 text-[10px] text-primary border-primary/30 ${className || ""}`}>
      <Receipt className="h-3 w-3" /> Receipt available
    </Badge>
  );
}
