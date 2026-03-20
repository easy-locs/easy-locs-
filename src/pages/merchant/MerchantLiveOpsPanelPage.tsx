import { useNavigate } from "react-router-dom";

const OPS_ROWS = [
  { title: "Active Orders", value: "14" },
  { title: "Kitchen Queue", value: "6" },
  { title: "Driver Wait", value: "3" },
  { title: "Paused Items", value: "2" },
  { title: "Rush Mode", value: "On" },
  { title: "Avg Prep", value: "22 min" },
];

export default function MerchantLiveOpsPanelPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Live Ops Panel</h1>
          <p className="text-xs text-muted-foreground">Real-time merchant operations</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {OPS_ROWS.map((row) => (
          <div key={row.title} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="text-xs text-muted-foreground">{row.title}</div>
            <div className="text-lg font-bold mt-1">{row.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
