import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function DriverVehicleProfilePage() {
  const navigate = useNavigate();
  const [plate, setPlate] = useState("DUBAI-12345");
  const [vehicleType, setVehicleType] = useState("bike");
  const [color, setColor] = useState("red");

  const save = () => {
    toast.success("Vehicle profile saved");
    navigate("/driver/dashboard");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/driver/dashboard")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Vehicle Profile</h1>
          <p className="text-xs text-muted-foreground">Driver vehicle information</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/20 bg-card p-4">
        <input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="Plate number" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <input value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} placeholder="Vehicle type" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm mt-3" />
        <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Vehicle color" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm mt-3" />
        <button onClick={save} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold mt-4">Save Vehicle</button>
      </div>
    </div>
  );
}
