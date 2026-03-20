import { useNavigate } from "react-router-dom";

const PAYMENT_ROWS = [
  { label: "Successful captures", value: "94%" },
  { label: "Pending intents", value: "11" },
  { label: "Refund volume", value: "6 today" },
  { label: "Timeout risk", value: "Low" },
  { label: "Wallet sync", value: "Healthy" },
];

export default function AdminPaymentWatchPage() {
  const navigate = useNavigate();
  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Payment Watch" subtitle="Fast payments monitoring" onBack={() => navigate("/admin")} />
      <div className="space-y-3">
        {PAYMENT_ROWS.map((row) => (
          <div key={row.label} className="rounded-[28px] border border-border/20 bg-card p-4 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">{row.label}</div>
            <div className="rounded-full bg-primary/10 text-primary px-3 py-1 text-[11px] font-bold">{row.value}</div>
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
