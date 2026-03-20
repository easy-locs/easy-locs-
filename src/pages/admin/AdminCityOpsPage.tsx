import { useNavigate } from "react-router-dom";

const CITIES = [
  { name: "Dubai", merchants: 142, drivers: 68, orders: 1240 },
  { name: "Abu Dhabi", merchants: 53, drivers: 21, orders: 380 },
  { name: "Sharjah", merchants: 28, drivers: 12, orders: 190 },
];

export default function AdminCityOpsPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">City Ops</h1>
          <p className="text-xs text-muted-foreground">Operations by city</p>
        </div>
      </div>

      <div className="space-y-3">
        {CITIES.map((city) => (
          <div key={city.name} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="text-sm font-bold text-foreground">{city.name}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {city.merchants} merchants · {city.drivers} drivers · {city.orders} orders
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
