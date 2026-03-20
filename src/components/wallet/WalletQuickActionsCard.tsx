import { useNavigate } from "react-router-dom";

export default function WalletQuickActionsCard() {
  const navigate = useNavigate();

  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
      <div className="text-sm font-bold">Quick Actions</div>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate("/wallet/top-up")}
          className="rounded-2xl bg-primary text-primary-foreground px-4 py-4 text-sm font-bold"
        >
          Top Up
        </button>
        <button
          onClick={() => navigate("/wallet/transfer")}
          className="rounded-2xl bg-muted px-4 py-4 text-sm font-bold text-foreground"
        >
          Transfer
        </button>
        <button
          onClick={() => navigate("/settings/payment-methods")}
          className="rounded-2xl bg-muted px-4 py-4 text-sm font-bold text-foreground"
        >
          Payment Methods
        </button>
        <button
          onClick={() => navigate("/wallet/hub")}
          className="rounded-2xl bg-muted px-4 py-4 text-sm font-bold text-foreground"
        >
          Wallet Hub
        </button>
      </div>
    </div>
  );
}
