import { useNavigate } from "react-router-dom";

const PROMO_ROWS = [
  { name: "LUNCH10", redemptions: 84, revenue: 5220, conversion: "11.2%" },
  { name: "PIZZA15", redemptions: 121, revenue: 8460, conversion: "14.8%" },
  { name: "FREESHIP", redemptions: 63, revenue: 3125, conversion: "8.1%" },
  { name: "DINNER20", redemptions: 41, revenue: 3980, conversion: "6.4%" },
];

export default function AdminPromoPerformancePage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Promo Performance</h1>
          <p className="text-xs text-muted-foreground">Coupon analytics</p>
        </div>
      </div>

      <div className="space-y-3">
        {PROMO_ROWS.map((row) => (
          <div key={row.name} className="rounded-[28px] border border-border/20 bg-card p-4">
            <div className="text-sm font-bold">{row.name}</div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="rounded-2xl bg-muted/40 px-3 py-3 text-center">
                <div className="text-[10px] uppercase tracking-wide font-bold text-muted-foreground">Used</div>
                <div className="text-sm font-bold mt-2">{row.redemptions}</div>
              </div>
              <div className="rounded-2xl bg-muted/40 px-3 py-3 text-center">
                <div className="text-[10px] uppercase tracking-wide font-bold text-muted-foreground">Revenue</div>
                <div className="text-sm font-bold mt-2">{row.revenue}</div>
              </div>
              <div className="rounded-2xl bg-muted/40 px-3 py-3 text-center">
                <div className="text-[10px] uppercase tracking-wide font-bold text-muted-foreground">CVR</div>
                <div className="text-sm font-bold mt-2">{row.conversion}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
