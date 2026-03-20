import { useNavigate } from "react-router-dom";

const METHODS = [
  { label: "Wallet", detail: "Default payment source", status: "Active" },
  { label: "Visa **** 4242", detail: "Saved card", status: "Active" },
  { label: "Cash", detail: "Pay on delivery", status: "Available" },
  { label: "Apple Pay", detail: "Fast checkout", status: "Available" },
];

export default function CustomerPaymentMethodsHubPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/me")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Payment Methods</h1>
          <p className="text-xs text-muted-foreground">Manage how you pay</p>
        </div>
      </div>

      <div className="space-y-3">
        {METHODS.map((row) => (
          <div key={row.label} className="rounded-[28px] border border-border/20 bg-card p-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold">{row.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{row.detail}</div>
            </div>
            <div className="rounded-full bg-emerald-500/10 text-emerald-500 px-3 py-1 text-[11px] font-bold">{row.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
