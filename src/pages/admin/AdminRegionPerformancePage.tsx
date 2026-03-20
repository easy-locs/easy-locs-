import { useNavigate } from "react-router-dom";

const REGIONS = [
  { name: "Dubai Marina", orders: 128, gmv: 8420, avgBasket: 65.8 },
  { name: "JLT", orders: 96, gmv: 6010, avgBasket: 62.6 },
  { name: "Business Bay", orders: 111, gmv: 7450, avgBasket: 67.1 },
  { name: "Downtown Dubai", orders: 88, gmv: 6930, avgBasket: 78.8 },
  { name: "JVC", orders: 73, gmv: 4380, avgBasket: 60.0 },
];

export default function AdminRegionPerformancePage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Region Performance</h1>
          <p className="text-xs text-muted-foreground">Orders and GMV by zone</p>
        </div>
      </div>

      <div className="space-y-3">
        {REGIONS.map((row) => (
          <div key={row.name} className="rounded-[28px] border border-border/20 bg-card p-4">
            <div className="text-sm font-bold">{row.name}</div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="rounded-2xl bg-muted/40 px-3 py-3 text-center">
                <div className="text-[10px] uppercase tracking-wide font-bold text-muted-foreground">Orders</div>
                <div className="text-sm font-bold mt-2">{row.orders}</div>
              </div>
              <div className="rounded-2xl bg-muted/40 px-3 py-3 text-center">
                <div className="text-[10px] uppercase tracking-wide font-bold text-muted-foreground">GMV</div>
                <div className="text-sm font-bold mt-2">{row.gmv}</div>
              </div>
              <div className="rounded-2xl bg-muted/40 px-3 py-3 text-center">
                <div className="text-[10px] uppercase tracking-wide font-bold text-muted-foreground">Avg</div>
                <div className="text-sm font-bold mt-2">{row.avgBasket.toFixed(1)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
