/**
 * OrderCTABlock — Renders action buttons based on role and order status.
 */
import { Button } from "@/components/ui/button";
import type { OrderCTA } from "@/lib/order/unified-order-types";

interface Props {
  ctas: OrderCTA[];
  onAction: (action: string) => void;
  loading?: boolean;
}

export default function OrderCTABlock({ ctas, onAction, loading }: Props) {
  if (ctas.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {ctas.map((cta) => (
        <Button
          key={cta.action}
          size="sm"
          variant={cta.variant === "success" ? "default" : cta.variant}
          className={cta.variant === "success" ? "bg-success text-success-foreground hover:bg-success/90" : undefined}
          onClick={() => onAction(cta.action)}
          disabled={loading}
        >
          {cta.icon && <span className="mr-1">{cta.icon}</span>}
          {cta.label}
        </Button>
      ))}
    </div>
  );
}
