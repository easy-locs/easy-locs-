import { useNavigate } from "react-router-dom";

export default function OrderActionsCard({ orderId }: { orderId: string }) {
  const navigate = useNavigate();

  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
      <div className="text-sm font-bold">Order Actions</div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate(`/tracking/${orderId}`)}
          className="rounded-xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold"
        >
          Track
        </button>
        <button
          onClick={() => navigate(`/order/receipt/${orderId}`)}
          className="rounded-xl bg-muted px-4 py-3 text-sm font-bold text-foreground"
        >
          Receipt
        </button>
        <button
          onClick={() => navigate(`/order/reorder/${orderId}`)}
          className="rounded-xl bg-muted px-4 py-3 text-sm font-bold text-foreground"
        >
          Reorder
        </button>
        <button
          onClick={() => navigate(`/support/tickets`)}
          className="rounded-xl bg-muted px-4 py-3 text-sm font-bold text-foreground"
        >
          Support
        </button>
      </div>
    </div>
  );
}
