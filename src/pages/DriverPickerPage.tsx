import { useState } from "react";
import { BackCard } from "@/components/ui/back-card";
import { assignDriverDirectly, searchDrivers } from "@/lib/dispatch/driver-picker";

export default function DriverPickerPage() {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<any[]>([]);

  const search = async () => {
    const data = await searchDrivers({ query, serviceMode: "delivery", limit: 20 });
    setRows(data);
  };

  const assign = async (driverUserId: string) => {
    // In real use, pass actual orderId from context
    console.log("Assign driver", driverUserId);
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      <BackCard label="Back" to="/dashboard" />
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Driver Picker</h1>
        <p className="text-sm text-muted-foreground">Search and assign a live rider directly</p>
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by mode / vehicle / plate"
        />
        <button onClick={search} className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold">Search</button>
      </div>

      <div className="space-y-2">
        {rows.map((row: any) => (
          <div key={row.id} className="bg-card border border-border rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{row.service_mode}</p>
              <p className="text-xs text-muted-foreground">{row.vehicle_type} · {row.plate_number || "No plate"}</p>
              <p className="text-xs text-muted-foreground">online: {row.is_online ? "yes" : "no"} / available: {row.is_available ? "yes" : "no"}</p>
            </div>
            <button onClick={() => assign(row.user_id)} className="bg-accent text-accent-foreground px-3 py-1.5 rounded-lg text-xs font-semibold">
              Assign
            </button>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No drivers found. Try searching.</p>
        )}
      </div>
    </div>
  );
}
