import { useNavigate } from "react-router-dom";

const RECEIPTS = [
  { id: "1", ref: "R-1001", amount: 48.0, date: "2026-03-10" },
  { id: "2", ref: "R-1002", amount: 72.5, date: "2026-03-18" },
];

export default function CustomerReceiptVaultPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/me")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Receipt Vault</h1>
          <p className="text-xs text-muted-foreground">All receipts in one place</p>
        </div>
      </div>

      <div className="space-y-3">
        {RECEIPTS.map((row) => (
          <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="text-sm font-bold text-foreground">{row.ref}</div>
            <div className="text-xs text-muted-foreground mt-1">{row.amount.toFixed(2)} AED · {row.date}</div>
            <button className="mt-3 w-full rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-foreground">Open Receipt</button>
          </div>
        ))}
      </div>
    </div>
  );
}
