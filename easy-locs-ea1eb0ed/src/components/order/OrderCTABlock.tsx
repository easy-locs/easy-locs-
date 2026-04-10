/**
 * OrderCTABlock — Renders action buttons based on role and order status.
 * Unified sizing: consistent with Delivery mission CTAs.
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
          className={`flex-1 min-w-[120px] text-xs h-9 ${
            cta.variant === "success" ? "bg-[#22C55E] text-white hover:bg-[#22C55E]/90" : ""
          }`}
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
