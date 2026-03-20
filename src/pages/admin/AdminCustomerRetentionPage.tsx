import { useNavigate } from "react-router-dom";

const RETENTION = [
  { label: "7-day repeat", value: "34%" },
  { label: "30-day repeat", value: "21%" },
  { label: "Loyalty active users", value: "418" },
  { label: "Favorites users", value: "286" },
  { label: "Auto repeat users", value: "39" },
  { label: "Saved carts users", value: "121" },
];

export default function AdminCustomerRetentionPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Customer Retention</h1>
          <p className="text-xs text-muted-foreground">Repeat and loyalty metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {RETENTION.map((row) => (
          <div key={row.label} className="rounded-2xl border border-border/20 bg-card p-4">
            <p className="text-xs text-muted-foreground">{row.label}</p>
            <p className="text-lg font-bold text-foreground">{row.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
