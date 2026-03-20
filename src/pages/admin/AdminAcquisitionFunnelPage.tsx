import { useNavigate } from "react-router-dom";

const FUNNEL = [
  { label: "App Visits", value: 12450 },
  { label: "Search Used", value: 6820 },
  { label: "Merchant Views", value: 4310 },
  { label: "Add To Cart", value: 2140 },
  { label: "Checkout Started", value: 1285 },
  { label: "Orders Created", value: 974 },
];

export default function AdminAcquisitionFunnelPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Acquisition Funnel</h1>
          <p className="text-xs text-muted-foreground">Conversion pipeline</p>
        </div>
      </div>

      <div className="space-y-3">
        {FUNNEL.map((row, index) => {
          const width = `${Math.max(18, 100 - index * 11)}%`;
          return (
            <div key={row.label} className="rounded-[28px] border border-border/20 bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-bold">{row.label}</div>
                <div className="text-sm font-bold">{row.value}</div>
              </div>
              <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
