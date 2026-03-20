import { useNavigate } from "react-router-dom";

const RECON_ROWS = [
  { label: "Ledger entries", value: "1,248" },
  { label: "Matched orders", value: "1,196" },
  { label: "Pending adjustments", value: "12" },
  { label: "Mismatch alerts", value: "3" },
];

export default function AdminWalletReconPage() {
  const navigate = useNavigate();
  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Wallet Reconciliation" subtitle="Ledger integrity snapshot" onBack={() => navigate("/admin")} />
      <div className="grid grid-cols-2 gap-3">
        {RECON_ROWS.map((row) => (
          <div key={row.label} className="rounded-[28px] border border-border/20 bg-card p-4">
            <div className="text-[11px] uppercase tracking-wide font-bold text-muted-foreground">{row.label}</div>
            <div className="text-lg font-bold mt-2">{row.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Header({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={onBack} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
      <div>
        <h1 className="text-lg font-bold">{title}</h1>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
