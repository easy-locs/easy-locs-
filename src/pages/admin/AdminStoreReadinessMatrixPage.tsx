import { useNavigate } from "react-router-dom";

const STORE_ROWS = [
  { name: "Pizza Times Marina", menu: true, payments: true, drivers: true, support: true },
  { name: "Pizza Times Downtown", menu: true, payments: true, drivers: false, support: true },
  { name: "Pizza Times JVC", menu: true, payments: false, drivers: true, support: true },
  { name: "Pizza Times Business Bay", menu: true, payments: true, drivers: true, support: false },
];

export default function AdminStoreReadinessMatrixPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Store Readiness Matrix</h1>
          <p className="text-xs text-muted-foreground">Launch readiness by store</p>
        </div>
      </div>

      <div className="space-y-3">
        {STORE_ROWS.map((row) => (
          <div key={row.name} className="rounded-[28px] border border-border/20 bg-card p-4">
            <div className="text-sm font-bold">{row.name}</div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {[
                { label: "Menu", value: row.menu },
                { label: "Payments", value: row.payments },
                { label: "Drivers", value: row.drivers },
                { label: "Support", value: row.support },
              ].map((item) => (
                <div key={item.label} className={`rounded-full px-3 py-2 text-[11px] font-bold text-center ${item.value ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
