import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const ZONES = [
  "Business Bay",
  "Dubai Marina",
  "JVC",
  "JLT",
  "Al Barsha",
  "Downtown Dubai",
];

export default function DriverAvailabilityZonesPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string[]>(["Business Bay", "Dubai Marina"]);

  const toggleZone = (zone: string) => {
    setSelected((prev) =>
      prev.includes(zone) ? prev.filter((z) => z !== zone) : [...prev, zone]
    );
  };

  const save = () => {
    toast.success("Availability zones updated");
    navigate("/driver/dashboard");
  };

  return (
    <div className="app-mobile-page bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/driver/dashboard")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Availability Zones</h1>
          <p className="text-xs text-muted-foreground">Select preferred working areas</p>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {ZONES.map((zone) => {
          const active = selected.includes(zone);
          return (
            <button
              key={zone}
              onClick={() => toggleZone(zone)}
              className={`w-full rounded-2xl border p-4 text-left ${
                active ? "border-primary bg-primary/5" : "border-border/20 bg-card"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">{zone}</p>
                <div
                  className={`w-5 h-5 rounded-full border-2 ${
                    active ? "border-primary bg-primary" : "border-border"
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={save}
        className="mx-4 mt-4 w-[calc(100%-2rem)] rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold"
      >
        Save Zones
      </button>
    </div>
  );
}
