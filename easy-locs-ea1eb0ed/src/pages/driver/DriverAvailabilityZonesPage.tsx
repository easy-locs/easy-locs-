import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

const ZONES = [
  "Business Bay",
  "Dubai Marina",
  "JVC",
  "JLT",
  "Al Barsha",
  "Downtown Dubai",
];

export default function DriverAvailabilityZonesPage() {
  useUiEngine("driver-driveravailabilityzonespage");
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
    <SubPageShell title="Availability Zones" subtitle="Select preferred working areas" onBack={() => navigate("/driver/dashboard")}>
      <div className="space-y-3">
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
        className="mt-4 w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold"
      >
        Save Zones
      </button>
    </SubPageShell>
  );
}
